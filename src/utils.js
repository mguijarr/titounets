import React from "react";
import ReactDOM from "react-dom";
import {
  Row,
  Col,
  Form,
  FormGroup,
  FormControl,
  ControlLabel,
  Glyphicon
} from "react-bootstrap";
import Moment from "moment";
import { extendMoment } from "moment-range";
import _DatePicker from "react-bootstrap-date-picker";
import "../node_modules/pdfmake/build/pdfmake.min.js";
import "../node_modules/pdfmake/build/vfs_fonts.js";

const moment = extendMoment(Moment);

export function findDays(period) {
  const days = {};
  // return array of days present in a range
  const range = moment.range(...period);
  for (const moment of range.by("day")) {
    const day = moment.isoWeekday();
    // iso day: 1=Monday, 7=Sunday
    if (day <= 5) {
      days[day] = true;
    }
  }
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

  Object.keys(familyData.children).forEach((childName) => {
    const c = familyData.children[childName];
    names[c.surname.toUpperCase()] = true;
  });

  if (Object.keys(names).length === 0) {
    // no child ?
    familyData.parents.forEach(p => {
      names[p.toUpperCase()] = true;
    });
  }

  return Object.keys(names).join(" / ");
}

export function formatClockTime(s) {
  // return 'hh:mm' string from s seconds
  const h = Math.floor(s / 3600);
  const m = (s % 3600) / 60;
  const hh = ("0" + h).slice(-2);
  const mm = ("0" + m).slice(-2);
  return `${hh}:${mm}`;
}

export class TimePicker extends React.Component {
  constructor(props) {
    super(props);
    
    this.calcStartEndMinutes = this.calcStartEndMinutes.bind(this);

    this.state = { ...this.calcStartEndMinutes(props), value: props.value*3600 };
  }

  calcStartEndMinutes(props) {
    /*const startDate = new Date('1980-05-08T'+props.start+':00.000+02:00');
    const sH = startDate.getHours(); const sM = startDate.getMinutes();
    const endDate = new Date('1980-05-08T'+props.end+':00.000+02:00');
    const eH = endDate.getHours(); const eM = endDate.getMinutes();*/
    // props.start and props.end are given in hours (9.5 = 9h30)
    const start = props.start*3600;
    const end = props.end*3600;

    return { start, end, step: props.step || 30 };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ ...this.calcStartEndMinutes(nextProps) });
  }

  onChange(time) {
    // time is internally stored in seconds
    this.setState({ value: time });
    // value for callback is in hours
    this.props.onChange(time / 3600);
  }

  render() {
    const clockTime = [];
    const seconds = [];

    for (let s = this.state.start; s<=this.state.end; s+=(this.state.step*60)) {
      seconds.push(s);
      clockTime.push(formatClockTime(s));
    }

    return (<FormGroup>
      <FormControl componentClass="select" 
                   onChange = {(e) => { this.onChange(parseInt(e.target.value, 10)); }}
                   value = {this.state.value}>
        {clockTime.map((hhmm, i) => { return <option key={i} value={seconds[i]}>{hhmm}</option> }) }
      </FormControl>
    </FormGroup>);
  }
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
                readOnly={this.props.readOnly}
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
                readOnly={this.props.readOnly}
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
                readOnly={this.props.readOnly}
                valueObject={this.props.formValues}
                valueKey="zip"
                onChange={this.formValueChanged}
              />
            </Col>
            <Col sm={1} componentClass={ControlLabel}>Ville</Col>
            <Col sm={6}>
              <TextInput
                readOnly={this.props.readOnly}
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
                readOnly={this.props.readOnly}
                valueObject={this.props.formValues}
                valueKey="email"
                onChange={this.formValueChanged}
              />
            </Col>
            <Col sm={1} componentClass={ControlLabel}>Tel</Col>
            <Col sm={3}>
              <TextInput
                readOnly={this.props.readOnly}
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

AddressFields.defaultProps = { readOnly: false };

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

export function isClosed(day, closedPeriods) {
  return closedPeriods.some(p => {
    return moment(day).within(p);
  }) || isWeekend(day) || isBankHoliday(day);
}

export function getCAFData(id, till, cb) {
    if (till === 'MSA') { return cb({ id, till, children:{}, address:{street: ["",""] }, parents:["",""] }); }

    fetch("/api/caf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, till })
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        res.id = id;
        res.till = till;
        cb(res);
      });
}

export function formatHour(m) {
  // m: minutes or array for range of minutes
  if (m.constructor === Array) {
    return formatHour(m[0]) + " - " + formatHour(m[1]);
  } else {
    m = parseInt(m);
    const hh = ("0" + Math.floor(m / 60)).slice(-2);
    const mm = ("0" + m % 60).slice(-2);
    return `${hh}:${mm}`;
  }
}

export const DatePicker = (prop) => (
   <_DatePicker monthLabels={
                      [
                        "Janvier",
                        "Fevrier",
                        "Mars",
                        "Avril",
                        "Mai",
                        "Juin",
                        "Juillet",
                        "Aout",
                        "Septembre",
                        "Octobre",
                        "Novembre",
                        "Decembre"
                      ]
                    }
                    showClearButton={false}
                    dayLabels={
                      [ "Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam" ]
                    }
                    dateFormat="DD/MM/YYYY" {...prop}/>
);

export function downloadBill(content) {
  let docDefinition = {
      content,
      styles: {
        title: { fontSize: 16, bold: true, alignment: "center" },
        centered: { alignment: "center" },
        bigTitle: { fontSize: 20, bold: true, alignment: "center" },
        marginTop: 20, marginBottom: 20, marginLeft: 20, marginRight: 20
      },
      defaultStyle: { fontSize: 10 },
      pageBreakBefore: (currentNode, followingNodesOnPage, nodesOnNextPage, previousNodesOnPage) => {
        return currentNode.startPosition.top >= 750;
      }
  }

  if (content.length > 0) { pdfMake.createPdf(docDefinition).download(); }
}

function adjustHour(h, d, opening, closing) {
    const _opening = Number(opening);
    const _closing = Number(closing);
    let H = 0;
    d = d || 1;
    if (d < 0) {
      H = Math.floor(h);
      if ((h - H) >= 0.5) { H+=0.5; }
    } else {
      H = Math.ceil(h);
      if ((H - h) >= 0.5) { H-=0.5; }
    }
    if (H < _opening) { H = _opening; }
    if (H > _closing) { H = _closing; }
    return H;
}

export function getHours(childHours, periods, month, year, opening, closing, hoursRef) {
    const res = [];
    hoursRef.done = 0;
    hoursRef.paid = 0;
    Object.keys(childHours).forEach((day) => {
      const hours = childHours[day];
      const h1 = formatHour(hours[0]*60);
      const h2 = formatHour(hours[1]*60);
      const m = moment(day, "YYYY-MM-DD");
      if ((m.year() === Number(year) && (m.month() === Number(month)))) {
        hoursRef.done += hours[1]-hours[0];
        let arriving = adjustHour(hours[0], -1, opening, closing);
        let leaving = adjustHour(hours[1], 1, opening, closing);
        let a = formatHour(60*arriving);
        let d = formatHour(60*leaving);
        if ((periods != undefined) && (periods.length > 0)) {
          for (let p of periods) {
            if (p.range.contains(m)) {
              const contractHours = p.timetable[m.day()];
              if (contractHours === null) {
                // hors contrat: child present but not in contract timetable for period
                hoursRef.paid += leaving - arriving;
                res.push({ day: m.format("DD-MM-YYYY"), label1: `${a} (${h1}), hors contrat`, arriving, label2: `${d} (${h2}), hors contrat`, leaving, contractHours: [0, 0] });
                return res;
              } else {
                let skip = true;
                arriving = contractHours[0];
                leaving = contractHours[1];
                const c1 = formatHour(arriving*60);
                const c2 = formatHour(leaving*60);
                //console.log("c1 "+c1+", c2 "+c2);
                if ((hours[0] - arriving) < (-5/60)) {
                  arriving = adjustHour(hours[0], -1, opening, closing);
                  skip = false;
                }
                if ((hours[1] - leaving) > (5/60)) {
                  leaving = adjustHour(hours[1], 1, opening, closing);
                  skip = false;
                }
                hoursRef.paid += leaving - arriving;
                if (! skip) {
                  a = formatHour(60*arriving);
                  d = formatHour(60*leaving);
                  res.push({ day: m.format("DD-MM-YYYY"), label1: `${a} (${h1}), contrat: ${c1}`, arriving, label2: `${d} (${h2}), contrat: ${c2}`, leaving, contractHours });
                } 
                return res;
              }
            }
          } 
          // hors contrat: child present but not in a period 
          hoursRef.paid += leaving - arriving;
          res.push({ day: m.format("DD-MM-YYYY"), label1: `${a} (${h1}), hors contrat`, arriving, label2: `${d} (${h2}), hors contrat`, leaving, contractHours: [0,0] });
        } else {
          // heures realisees
          hoursRef.paid += leaving - arriving;
          res.push({ day: m.format("DD-MM-YYYY"), label1: `${a} (${h1})`, arriving, label2: `${d} (${h2})`, leaving, contractHours: [0,0] });
        }
      }
    });
    //console.log(res);
    return res;
}

