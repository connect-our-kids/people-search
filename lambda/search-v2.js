"use strict";

// TEST Query
// SLS_DEBUG=* AWS_PROFILE=cok SLS_DEBUG=* serverless invoke local -X -f searchv2 --data '{ "body": {"person":"%7B%22urls%22:%20%5B%7B%22url%22:%20%22https://twitter.com/dreamingwell%22%7D%5D%7D"}, top_match: true}'
// SLS_DEBUG=* AWS_PROFILE=cok SLS_DEBUG=* serverless invoke local -X -f searchv2 --data '{ "body": {"search_pointer_hash":"Travis-Collins-4bed4163ddf0f80"}}'

const request = require("then-request");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const HttpClientUtils = require("./util.js");
const httpClientUtils = new HttpClientUtils();
const sha256 = require("sha-256-js");
const Cache = require("./search-cache.js");
const SearchPointersCache = require("./search-pointers-cache");
const CachePutRequest = require("./cache-put-request");
const searchPointersCache = new SearchPointersCache();
const HashMap = require("HashMap");

const cache = new Cache();

exports.query = (event, context, callback) => {
  if (
    event.headers != null &&
    event.headers["Host"] == "search.connectourkids.org"
  ) {
    console.debug = function () {}; // disable debug logging on production
  }

  console.debug(event);

  let bodyParameters = getBodyParameters(event);

  console.debug("Request Body Parameters");
  console.debug(bodyParameters);

  // Get the query parameters
  httpClientUtils.getApplicationParameters("/pipl/").then(
    function (appConfiguration) {
      makePiplRequestBodyParameters(bodyParameters)
        .then((piplBodyParameters) => {
          if (bodyParameters.top_match == null) {
            bodyParameters.top_match = "false";
          }
          console.log(piplBodyParameters);

          let cacheKey = makeQueryCacheKey(piplBodyParameters, bodyParameters);

          console.debug("Cache key: " + cacheKey);

          // Check the query cache
          cache.get(cacheKey).then((cacheGetResponse) => {
            if (cacheGetResponse.getItem() != null) {
              console.debug("Cache hit");
              console.debug(cacheGetResponse.getItem());
              httpClientUtils.sendResponse(
                callback,
                200,
                cacheGetResponse.getItem()
              );
              return;
            }

            let requestPromise = request(
              "POST",
              makeRequestUrl(bodyParameters, appConfiguration),
              makeRequestBody(piplBodyParameters)
            );

            requestPromise.done((result) => {
              // replace possible person search pointers with hashes

              let responseBody = new String(result.getBody());

              processPiplResponseBody(responseBody).then(
                (processedResponseBody) => {
                  // Store successful results
                  if (result.statusCode == 200)
                    cache
                      .put(cacheKey, processedResponseBody)
                      .then((cacheResult) => {
                        //console.debug("Dynamo Put Response: " + result);
                        httpClientUtils.sendResponse(
                          callback,
                          result.statusCode,
                          processedResponseBody
                        );
                      });
                }
              );
            });
          });
        })
        .catch((error) => {
          httpClientUtils.sendResponse(callback, 500, error);
        });
    },
    function () {
      // error
      httpClientUtils.sendResponse(callback, 500, "Could not read parameters");
    }
  );
};

/** Does transformations on the response from Pipl before returning the results */
function processPiplResponseBody(responseBody) {
  let response = JSON.parse(responseBody);

  let putRequests = new HashMap();

  if (response.possible_persons != null) {
    for (let possiblePerson of response.possible_persons) {
      let hash = "";

      if (possiblePerson.names != null && possiblePerson.names.length > 0) {
        if (possiblePerson.names[0].first) hash = possiblePerson.names[0].first;

        if (possiblePerson.names[0].middle) {
          if (hash != "") hash += "-";
          hash += possiblePerson.names[0].middle;
        }

        if (possiblePerson.names[0].last) {
          if (hash != "") hash += "-";
          hash += possiblePerson.names[0].last;
        }

        if (hash != "") hash += "-";

        hash += sha256(possiblePerson["@search_pointer"]).substr(0, 15);
      } else {
        hash = sha256(possiblePerson["@search_pointer"]).substr(0, 15);
      }

      possiblePerson["@search_pointer_hash"] = hash;

      // The hash to save in bulk
      putRequests.set(
        hash,
        new CachePutRequest(hash, possiblePerson["@search_pointer"])
      );
    }
  }

  console.debug("Put Requests");
  console.debug(putRequests);

  let bodyProcessed = JSON.stringify(response);

  if (putRequests.size == 0) {
    return new Promise((resolve) => {
      resolve(bodyProcessed);
    });
  }

  return new Promise((resolve) => {
    searchPointersCache.put(putRequests.values()).then((success) => {
      // TODO what happens when the puts are not successful?
      // Need to use error catching
      resolve(bodyProcessed);
    });
  });
}

function makeQueryCacheKey(query, queryParameters) {
  console.debug("cache key query body: " + JSON.stringify(query));
  return (
    sha256(JSON.stringify(query)) +
    "-" +
    queryParameters.top_match +
    "-" +
    (httpClientUtils.checkAuthentication(queryParameters) ? "true" : "false")
  );
}

function makePiplRequestBodyParameters(bodyParameters) {
  console.debug("Make Query Parts: ");
  console.debug(bodyParameters);

  if (bodyParameters != null && bodyParameters["search_pointer_hash"] != null) {
    return new Promise((resolve) => {
      // get the real search pointer from the hash
      searchPointersCache
        .get(bodyParameters["search_pointer_hash"])
        .then((value) => {
          resolve({ search_pointer: value.getItem() });
        });
    });
  } else {
    return new Promise((resolve) => {
      let person = JSON.parse(decodeURI(bodyParameters["person"]));
      resolve({ person: person });
    });
  }
}

function makeRequestUrl(queryParameters, appConfiguration) {
  let url = "https://api.pipl.com/search/?key=";

  if (httpClientUtils.checkAuthentication(queryParameters))
    url += appConfiguration["/pipl/business-key"];
  else url += appConfiguration["/pipl/teaser-key"];

  url += `&top_match=${queryParameters.top_match}`;
  console.debug("Pipl Query URL");
  console.debug(url);

  return url;
}

function makeRequestBody(queryParts) {
  console.debug("Make Request body");
  console.debug(queryParts);

  let FormData = request.FormData;
  let data = new FormData();

  for (let key in queryParts) {
    if (typeof queryParts[key] == "object")
      data.append(key, JSON.stringify(queryParts[key]));
    else data.append(key, queryParts[key]);
  }

  let returnValue = { form: data };

  console.debug("Body raw value");
  console.debug(returnValue);

  return returnValue;
}

function getBodyParameters(event) {
  if (event.isBase64Encoded) {
    let queryParametersString = new Buffer(event.body, "base64").toString(
      "ascii"
    );

    console.debug("Query Parameters String");
    console.debug(queryParametersString);

    return JSON.parse(queryParametersString.toString());
  } else if (typeof event === "string") {
    return JSON.parse(event).body;
  } else {
    console.debug("found queryStringParameters");
    return event.body;
  }
}
