const ssm = require('aws-ssm-params');
const jwt = require( 'jsonwebtoken');

const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE.split(/\s/).map(s => s.trim()); // split by whitespace (\s)

module.exports = class HttpClientUtils {


/** Returns the AWS parameters configured for the environment */
  getApplicationParameters(path) {

    let ssmParams = {
        Path: path,
        WithDecryption: true
    };

    let awsParams = {region: 'us-east-1'};


    return new Promise(function(resolve, reject){
      ssm(ssmParams,awsParams)
        .then(function(parameters){
        resolve(parameters);
      },function(err){
        reject(err);
      })

    });

  }

  encodeQueryParameters(parameters) {

    var value = "";

    for (let key in parameters) {

      if(value != "")
        value +="&";
      value += key + "=" + encodeURI(parameters[key]);

    }

    return value;
  }

  getQueryParameters(event) {
    if(event.isBase64Encoded) {
      let queryParametersString = new Buffer(event.body,"base64").toString("ascii") ;

      console.debug("Query Parameters String");
      console.debug(queryParametersString);

      return JSON.parse(queryParametersString.toString());
    } else {

      console.debug("found body");
      return event.queryStringParameters;
    }
  }

  sendResponse(callback, statusCode, body, headers = {}, bodyBase64Encoded = false) {

    const response = {
      statusCode: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: body,
      isBase64Encoded:bodyBase64Encoded
    };

    Object.keys(headers).forEach(function(key) {
      response.headers[key] = headers[key];
    });

    if(statusCode != 200) {
      console.error("There was an error. statusCode: " + statusCode + " body: " + body);
    }

    callback(null, response);

  }


  validateEmail(email) {
      var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(String(email).toLowerCase());
  }

  validateUrl(url) {
    if(url == null || url == "")
      return false;
    let regexp =  /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
          if (regexp.test(url))
          {
            return true;
          }
          else
          {
            return false;
          }
  }

  validatePhone(phone) {
    if(phone == null || phone == "")
      return false;

    let numbersOnly = phone.replace(/\D/g,'');
    if(numbersOnly.length < 10 ) {
      return false;
    }

    return true;

  }

  validateUserName(username) {
      if(username == null || username == "")
        return false;

      // Check for white space
      if (username.indexOf(" ") >= 0) {
          return false;
      }
      return true;
  }

  checkAuthentication(queryParameters, scopes) {
    if (queryParameters["authToken"] == null) {
      return false;
    }

    return   jwt.verify(queryParameters["authToken"],"-----BEGIN CERTIFICATE-----\n" +
      "MIIDCzCCAfOgAwIBAgIJcSHKniEXE/FnMA0GCSqGSIb3DQEBCwUAMCMxITAfBgNV\n" +
      "BAMTGGNvbm5lY3RvdXJraWRzLmF1dGgwLmNvbTAeFw0xOTAzMDQxNTQ1MjdaFw0z\n" +
      "MjExMTAxNTQ1MjdaMCMxITAfBgNVBAMTGGNvbm5lY3RvdXJraWRzLmF1dGgwLmNv\n" +
      "bTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJzjda6SM9bniQi4UZXH\n" +
      "I/NryAZq9VUR+CmhBcfgZOjGfJsW5IdfUKDWZBM+SyT5nnI+YzZmXShz29AO7hrM\n" +
      "vUZVfFLGCVfWXX4EuIXJjNm13I0FhHpeU4kdG3w86EbfaBFY+KSamDgUlFokrVxL\n" +
      "qiLcbb2U6I8QYyZpG+3TI7Es3wtIMcmUEnIC1qZusZT+TiR4MIw1h+rDigXn6ot/\n" +
      "8SmlWYkHN4lEiX3y8vEmKyGiQSR99Qpr3nkN31qu61nLwAiNnEHRLLPejtPy3i7F\n" +
      "kqpU3S9F9nkUuO/wCUaGp4Bs21VOiCRtE0VghsEbaFDEOHxfxAL6s+1Ip3y0ewc1\n" +
      "j7MCAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUfk3MumVh036J\n" +
      "M+689meF1hcT7skwDgYDVR0PAQH/BAQDAgKEMA0GCSqGSIb3DQEBCwUAA4IBAQAi\n" +
      "dadk93ytvFD4sS+ZhbtZkbrFrOEJLlDQTvLMq7gMy3XRPGx03dhGwQLO37vOGppg\n" +
      "Q6qd0bEOPDbOaw3ZCBFiqLi1HadtDU64bjGiAxJwlxA0HuPYZALP1nx9c7pkNe7W\n" +
      "zdMldEChuGDisp7ktfC6DC/qlwW6JWtVpEdPjC+y8QqbOYkjS/2qa7vpPAQ3UuNE\n" +
      "T7erFE7Pe6/j10eqI+PGGgeTkDkIdax/Bjl0osnY16dVnwJ1tWp1yLWnfYWjGWgJ\n" +
      "WIZnxsMdr5vKMyWR3TQ7+LgwIlwd0IZk8zv/Kx8ackSHKS33DWPexqWAp2Hi/C/6\n" +
      "AXw/ai4vXFcL4nZ80f+A\n" +
      "-----END CERTIFICATE-----\n",
      {
        audience: AUTH0_AUDIENCE,
        issuer: process.env.AUTH0_DOMAIN
      });

  }

};

