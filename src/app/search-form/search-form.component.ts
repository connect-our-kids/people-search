import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Params, Router } from "@angular/router";

@Component({
  selector: "app-search-form",
  templateUrl: "./search-form.component.html",
  styleUrls: ["./search-form.component.scss"],
})
export class SearchFormComponent implements OnInit {
  @Output() searchUpdated: EventEmitter<any> = new EventEmitter();

  searchForm = new FormGroup({
    main: new FormControl("", Validators.minLength(1)),
    location: new FormControl(""),
    relationship: new FormControl(null),
  });

  private sub = null;

  SearchType = SearchType;
  searchType = SearchType.NAME;

  private lastParams = {};
  public showRelationshipInput: boolean = false;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.sub = this.route.params.subscribe((params) => {
      this.parametersChanged(params);
    });
  }

  onSearch() {
    switch (this.searchType) {
      case SearchType.NAME:
        this.onSearchName();
        break;

      case SearchType.EMAIL:
        this.onSearchEmail();
        break;

      case SearchType.URL:
        this.onSearchUrl();
        break;

      case SearchType.ADDRESS:
        this.onSearchAddress();
        break;

      case SearchType.PHONE:
        this.onSearchPhone();
        break;

      default:
        console.error("Unknown type:" + this.searchType);
        this.onSearchName();
    }
  }

  onSearchPhone() {
    const extras: Object = {
      m: this.main,
      t: this.searchType.toString(),
    };
    if (this.relationship) {
      extras["r"] = this.relationship;
    }
    this.router.navigate(["/search", extras]);
  }

  onSearchAddress() {
    this.router.navigate([
      "/search",
      { m: this.main, t: this.searchType.toString() },
    ]);
  }

  onSearchUrl() {
    this.router.navigate([
      "/search",
      { m: encodeURI(this.main), t: this.searchType.toString() },
    ]);
  }

  onSearchEmail() {
    this.router.navigate([
      "/search",
      { m: this.main, t: this.searchType.toString() },
    ]);
  }

  onSearchName() {
    const extras: Object = {
      m: this.main,
      t: this.searchType.toString(),
    };

    if (this.location != null) {
      extras["l"] = this.location;
    }
    if (this.relationship != null) {
      extras["r"] = this.relationship;
    }

    this.router.navigate(["/search", extras]);
  }

  startOverClick() {
    this.router.navigate(["/"]);
  }

  parametersChanged(params) {
    this.searchType = this.detectInputType(params);
    if (params["r"] != null) {
      this.showRelationshipInput = true;
    }

    switch (this.searchType) {
      case SearchType.NAME:
        this.parametersChangedName(params);
        break;

      case SearchType.EMAIL:
        this.parametersChangedEmail(params);
        break;

      case SearchType.URL:
        this.parametersChangedUrl(params);
        break;

      case SearchType.ADDRESS:
        this.parametersChangedAddress(params);
        break;

      case SearchType.PHONE:
        this.parametersChangedPhone(params);
        break;

      case SearchType.PERSON:
        this.parametersChangedPerson(params);
        break;

      default:
        console.error("Unknown type:" + this.searchType);
    }

    this.lastParams = params;

    this.searchUpdated.emit();
  }

  parametersChangedPerson(params: String[]) {}

  parametersChangedPhone(params: String[]) {
    this.searchForm.get("main").setValue(params["m"]);
    this.searchForm.get("location").setValue("");
  }

  parametersChangedAddress(params: String[]) {
    this.searchForm.get("main").setValue(params["m"]);
    this.searchForm.get("location").setValue("");
  }

  parametersChangedUrl(params: String[]) {
    this.searchForm.get("main").setValue(params["m"]);
    this.searchForm.get("location").setValue("");
  }

  parametersChangedEmail(params: String[]) {
    this.searchForm.get("main").setValue(params["m"]);
    this.searchForm.get("location").setValue("");
  }

  parametersChangedName(params: String[]) {
    this.searchForm.get("main").setValue(params["m"]);
    this.searchForm.get("location").setValue(params["l"]);
    this.searchForm.get("relationship").setValue(params["r"]);
  }

  setSearchType(searchType: SearchType) {
    if (this.searchType === searchType) {
      return;
    }

    this.searchForm.get("main").reset();
    this.searchForm.get("location").reset();
    this.searchForm.get("relationship").reset();

    this.searchType = searchType;
  }

  generateSearchHint(searchType: SearchType) {
    if (searchType === SearchType.PHONE) {
      return "Phone any format, no letters";
    }

    if (searchType === SearchType.ADDRESS) {
      return "123 Main St, Metropolis, IL";
    }

    if (searchType === SearchType.NAME) {
      return "First and last, middle optional";
    }

    if (searchType === SearchType.URL) {
      return "Social profile link or any URL";
    }

    if (searchType === SearchType.EMAIL) {
      return "Email address";
    }

    return "";
  }

  getTitle() {
    let title = this.searchForm.get("main").value;
    if (this.searchForm.get("location").value !== "") {
      title += " - " + this.searchForm.get("location").value;
    }
    return title;
  }

  updateSearchParameters(
    mainInput: String,
    locationInput: String,
    searchType: SearchType
  ) {
    const extras: Object = {};

    if (searchType != null) {
      extras["t"] = searchType;
    }

    if (mainInput != null) {
      extras["m"] = mainInput;
    }
    if (locationInput != null) {
      extras["l"] = locationInput;
    }

    this.router.navigate(["/search", extras]);
  }

  validateSearch(): SearchValidationResult {
    const mainInputValue: String = this.searchForm.get("main").value;

    if (this.searchType === SearchType.EMAIL) {
      return this.validateEmail(mainInputValue);
    }

    if (this.searchType === SearchType.NAME) {
      return this.validateName(mainInputValue);
    }

    if (this.searchType === SearchType.PHONE) {
      return this.validatePhone(mainInputValue);
    }

    if (this.searchType === SearchType.ADDRESS) {
      return this.validateAddress(mainInputValue);
    }

    if (this.searchType === SearchType.URL) {
      return this.validateUrl(mainInputValue);
    }

    if (this.searchType === SearchType.PERSON) {
      return new SearchValidationResult(true, "", SearchType.PERSON);
    }

    return new SearchValidationResult(
      false,
      "Unknown detectedSearchType search type: " + this.searchType,
      null
    );
  }

  detectInputType(parameters): SearchType {
    const mainInputValue: string = parameters["m"];

    if (parameters["person"] != null) {
      return SearchType.PERSON;
    }

    const emailValidationResult = this.validateEmail(mainInputValue);

    if (emailValidationResult.valid) {
      return SearchType.EMAIL;
    }

    const urlValidationResult = this.validateUrl(mainInputValue);

    if (urlValidationResult.valid) {
      return SearchType.URL;
    }

    const phoneValidationResult = this.validatePhone(mainInputValue);

    if (phoneValidationResult.valid) {
      return SearchType.PHONE;
    }

    const addressValidationResult = this.validateAddress(mainInputValue);

    if (addressValidationResult.valid) {
      return SearchType.ADDRESS;
    }

    const nameValidationResult = this.validateName(mainInputValue);

    if (nameValidationResult.valid) {
      return SearchType.NAME;
    }

    return this.getSearchTypeFromParams(parameters);
  }

  getSearchTypeFromParams(parameters: Params) {
    if (parameters["t"] == null) {
      return SearchType.NAME;
    }

    let searchType = null;

    const searchTypeString: string = parameters["t"];

    if (searchTypeString != null) {
      searchType = this.SearchType[searchTypeString.toUpperCase()];
    }
    return searchType;
  }

  getSearchObject(searchValidationResult: SearchValidationResult) {
    if (this.lastParams["person"] != null) {
      return { search_pointer_hash: this.lastParams["person"] };
    }

    const searchType = searchValidationResult.validatorUsed;

    if (searchType == null) {
      return {};
    }

    let searchObject = {};

    if (searchType === SearchType.NAME) {
      searchObject = { names: [{ raw: this.lastParams["m"] }] };

      const locationValue = this.lastParams["l"];

      if (locationValue != null && locationValue !== "") {
        searchObject["addresses"] = [{ raw: locationValue }];
      }

      if (this.lastParams["r"] != null) {
        const names = this.lastParams["r"].split(" ");
        searchObject["relationships"] = [
          {
            names: [
              {
                first: names[0] ? names[0] : "",
                middle:
                  names.length > 2
                    ? names
                        .slice(1, names.length - 1)
                        .reduce((acc, cur) => acc + " " + cur) || ""
                    : "",
                last: names.length > 1 ? names[names.length - 1] : "",
              },
            ],
          },
        ];
      }
    } else if (searchType === SearchType.EMAIL) {
      searchObject = { emails: [{ address: this.lastParams["m"] }] };
    } else if (searchType === SearchType.PHONE) {
      const phoneNumbersOnly = (<String>this.lastParams["m"]).replace(
        /[^0-9\.]+/g,
        ""
      );

      searchObject = { phones: [{ number: phoneNumbersOnly }] };
    } else if (searchType === SearchType.ADDRESS) {
      searchObject = { addresses: [{ raw: this.lastParams["m"] }] };
    } else if (searchType === SearchType.URL) {
      searchObject = { urls: [{ url: decodeURI(this.lastParams["m"]) }] };
    }

    return searchObject;
  }

  toggleRelationshipInput() {
    if (this.showRelationshipInput) {
      this.searchForm.get("relationship").reset();
    }
    return (this.showRelationshipInput = !this.showRelationshipInput);
  }

  validateEmail(email): SearchValidationResult {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const result: boolean = re.test(String(email).toLowerCase());

    if (!result) {
      return new SearchValidationResult(
        false,
        "Please enter a valid email address",
        SearchType.EMAIL
      );
    }

    return new SearchValidationResult(true, "", SearchType.EMAIL);
  }

  validateUrl(url) {
    if (url == null || url === "") {
      return new SearchValidationResult(
        false,
        "Please enter a URL",
        SearchType.URL
      );
    }

    const regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;

    const result = regexp.test(url);

    if (!result) {
      return new SearchValidationResult(
        false,
        "Please enter a valid URL",
        SearchType.URL
      );
    }

    return new SearchValidationResult(true, "", SearchType.URL);
  }

  validatePhone(phone) {
    if (phone == null || phone === "") {
      return new SearchValidationResult(
        false,
        "Please enter a phone number",
        SearchType.PHONE
      );
    }

    if (/[a-zA-Z@#!&*=~`]/g.test(phone)) {
      return new SearchValidationResult(
        false,
        "Phone numbers must not contain alpha or special symbols",
        SearchType.PHONE
      );
    }

    const numbersOnly = phone.replace(/\D/g, "");
    if (numbersOnly.length < 10) {
      return new SearchValidationResult(
        false,
        "Phone numbers must 10 or more numbers ",
        SearchType.PHONE
      );
    }

    return new SearchValidationResult(true, "", SearchType.PHONE);
  }

  validateName(name) {
    if (name == null || name === "") {
      return new SearchValidationResult(
        false,
        "Please enter a first and last name. Middle name optional",
        SearchType.NAME
      );
    }

    const regexp = /\d/;
    if (regexp.test(name)) {
      return new SearchValidationResult(
        false,
        "Names may not contain numbers ",
        SearchType.NAME
      );
    }

    if (name.indexOf(" ") === -1) {
      return new SearchValidationResult(
        false,
        "Please enter both a first and last name",
        SearchType.NAME
      );
    }

    return new SearchValidationResult(true, "", SearchType.NAME);
  }

  validateAddress(address: String) {
    if (address == null || address === "") {
      return new SearchValidationResult(
        false,
        "Please enter an address.",
        SearchType.NAME
      );
    }

    const regexp = /^\d/;
    if (!regexp.test(address.toString())) {
      return new SearchValidationResult(
        false,
        "Addresses must start with a number.",
        SearchType.NAME
      );
    }

    if (
      address.indexOf(" ") === -1 ||
      address.indexOf(" ") === address.lastIndexOf(" ")
    ) {
      return new SearchValidationResult(
        false,
        "Addresses should contain house numbers, street names, city, and state",
        SearchType.NAME
      );
    }

    return new SearchValidationResult(true, "", SearchType.ADDRESS);
  }

  public get main() {
    return this.searchForm.get("main").value;
  }

  public get location() {
    return this.searchForm.get("location").value;
  }

  public get relationship() {
    return this.searchForm.get("relationship").value;
  }
}

export class SearchValidationResult {
  public valid: Boolean;

  public errorMessage: String;

  public validatorUsed: SearchType;

  constructor(
    valid: Boolean,
    errorMessage?: String,
    validatorUsed?: SearchType
  ) {
    this.valid = valid;
    this.errorMessage = errorMessage;
    this.validatorUsed = validatorUsed;
  }
}

export enum SearchType {
  NAME = "name",
  EMAIL = "email",
  ADDRESS = "address",
  PHONE = "phone",
  URL = "url",
  PERSON = "person", // For deeplinking to a specific person
}
