import React from "react";
import ReactDOM from "react-dom";
import {
  Row,
  Col,
  Form,
  FormGroup,
  FormControl,
  ControlLabel
} from "react-bootstrap";
import moment from "moment";
import "moment-range";

export function findDays(period) {
  const days = {};
  // return array of days present in a range
  const range = moment.range(...period);
  range.by("days", moment => {
    const day = moment.isoWeekday();
    // iso day: 1=Monday, 7=Sunday
    if (day <= 5) {
      days[day] = true;
    }
  });
  const daysArray = Object.keys(days);
  daysArray.sort();
  return daysArray;
}

export function isHoliday(day, holidays) {
  for (const d of holidays) {
    if (day._isValid) {
      let st = new Date(d.start[0], d.start[1] - 1, d.start[2]);
      let end = new Date(d.end[0], d.end[1] - 1, d.end[2]);
      const r = moment.range(moment(st), moment(end).add(-1, "day"));
      if (day.within(r)) {
        return true;
      }
    }
  }
  return false;
}

export function isWeekend(day) {
  return moment(day).weekday() >= 5;
}

export function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    var error = new Error(response.statusText);
    error.response = response;
    throw error;
  }
}

export function parseJSON(response) {
  return response.json();
}

export function getFamilyName(familyData) {
  const names = {};

  familyData.children.forEach(c => {
    names[c.surname.toUpperCase()] = true;
  });

  return Object.keys(names).join(" / ");
}

export class TextInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = { value: "" };
    this.textChanged = this.textChanged.bind(this);
  }

  textChanged(event) {
    const value = event.target.value;
    this.props.onChange(this.props.valueKey, value);
  }

  render() {
    return (
      <FormControl
        readOnly={this.props.readOnly}
        type="text"
        value={this.props.valueObject[this.props.valueKey] || ""}
        onChange={this.textChanged}
        onBlur={this.textChanged}
      />
    );
  }
}

export function getAddress(formData) {
  const address = {
    street: [ formData.address1 || "", formData.address2 || "" ],
    zip: formData.zip || "",
    city: formData.city || ""
  };
  const phone_number = formData.phone_number || "";
  const email = formData.email || "";

  return { address, phone_number, email };
}

export class AddressFields extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.formValueChanged = this.formValueChanged.bind(this);
  }

  formValueChanged(key, value) {
    this.props.valueChanged(key, value);
  }

  render() {
    return (
      <Row>
        <Form horizontal>
          <FormGroup>
            <Col sm={2} componentClass={ControlLabel}>Adresse</Col>
            <Col sm={10}>
              <TextInput
                valueObject={this.props.formValues}
                valueKey="address1"
                onChange={this.formValueChanged}
              />
            </Col>
          </FormGroup>
          <FormGroup>
            <Col sm={2} componentClass={ControlLabel}>{" "}</Col>
            <Col sm={10}>
              <TextInput
                valueObject={this.props.formValues}
                valueKey="address2"
                onChange={this.formValueChanged}
              />
            </Col>
          </FormGroup>
          <FormGroup>
            <Col sm={2} componentClass={ControlLabel}>CP</Col>
            <Col sm={3}>
              <TextInput
                valueObject={this.props.formValues}
                valueKey="zip"
                onChange={this.formValueChanged}
              />
            </Col>
            <Col sm={1} componentClass={ControlLabel}>Ville</Col>
            <Col sm={6}>
              <TextInput
                valueObject={this.props.formValues}
                valueKey="city"
                onChange={this.formValueChanged}
              />
            </Col>
          </FormGroup>
          <FormGroup>
            <Col sm={2} componentClass={ControlLabel}>Email</Col>
            <Col sm={6}>
              <TextInput
                valueObject={this.props.formValues}
                valueKey="email"
                onChange={this.formValueChanged}
              />
            </Col>
            <Col sm={1} componentClass={ControlLabel}>Tel</Col>
            <Col sm={3}>
              <TextInput
                valueObject={this.props.formValues}
                valueKey="phone_number"
                onChange={this.formValueChanged}
              />
            </Col>
          </FormGroup>
        </Form>
      </Row>
    );
  }
}

function easter(Y) {
  var C = Math.floor(Y / 100);
  var N = Y - 19 * Math.floor(Y / 19);
  var K = Math.floor((C - 17) / 25);
  var I = C - Math.floor(C / 4) - Math.floor((C - K) / 3) + 19 * N + 15;
  I = I - 30 * Math.floor(I / 30);
  I = I -
    Math.floor(I / 28) *
      (1 -
        Math.floor(I / 28) *
          Math.floor(29 / (I + 1)) *
          Math.floor((21 - N) / 11));
  var J = Y + Math.floor(Y / 4) + I + 2 - C + Math.floor(C / 4);
  J = J - 7 * Math.floor(J / 7);
  var L = I - J;
  var M = 3 + Math.floor((L + 40) / 44);
  var D = L + 28 - 31 * Math.floor(M / 4);

  return moment(new Date(Y, M - 1, D));
}

export function bankHolidayDays(year, alsace) {
  const paques = easter(year);
  const dates = [
    moment(new Date(year, 0, 1)),
    moment(new Date(year, 4, 1)),
    moment(new Date(year, 4, 8)),
    moment(new Date(year, 6, 14)),
    moment(new Date(year, 7, 15)),
    moment(new Date(year, 10, 1)),
    moment(new Date(year, 10, 11)),
    moment(new Date(year, 11, 25)),
    moment(paques).add(1, "days"),
    moment(paques).add(39, "days"),
    moment(paques).add(50, "days")
  ];
  if (alsace) {
    dates.push(moment(paques).add(-2));
    dates.push(new Date(year, 11, 26));
  }
  return dates;
}

export function isBankHoliday(day, alsace) {
  const year = day.year();
  const dates = bankHolidayDays(year, alsace);

  return dates.some(d => {
    return d.isSame(day);
  });
}
