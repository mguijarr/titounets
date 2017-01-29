import React from "react";
import ReactDOM from "react-dom";
import DatePicker from "react-bootstrap-date-picker";
import { ReactBootstrapSlider } from "react-bootstrap-slider";
import "bootstrap-slider/dist/css/bootstrap-slider.min.css!";
import "./css/Heures.css!";
import {
  Grid,
  Row,
  Col,
  Form,
  FormGroup,
  FormControl,
  ControlLabel,
  Button,
  Label,
  Glyphicon,
  Panel,
  PanelGroup,
  Modal,
  Checkbox
} from "react-bootstrap";
import ChildData from "./child.js";
import auth from "./auth";
import { checkStatus, parseJSON } from "./utils";

export default class Heures extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = {
      busy: false,
      children: [],
      openingHours: [ 8, 19 ],
      date: new Date().toISOString(),
      currentRange: []
    };

    this.formatHour = this.formatHour.bind(this);
    this.dateChanged = this.dateChanged.bind(this);
    this.getChildrenList = this.getChildrenList.bind(this);
    this.setHours = this.setHours.bind(this);
    this.hoursChanged = this.hoursChanged.bind(this);
  }

  getChildrenList(date) {
    this.setState({ busy: true });
    // get children list
    fetch("/children/" + date, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        this.setState({ children: res, busy: false });
      });
  }

  componentWillMount() {
    this.getChildrenList(this.state.date);

    this.setState({ busy: true });
    // get opening hours
    fetch("/parameters", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        this.setState({ openingHours: [res.opening, res.closing], busy: false });
      });
  }

  formatHour(m) {
    // m: minutes or array for range of minutes
    if (m.constructor === Array) {
      return this.formatHour(m[0]) + " - " + this.formatHour(m[1]);
    } else {
      const hh = ("0" + Math.floor(m / 60)).slice(-2);
      const mm = ("0" + m % 60).slice(-2);
      return `${hh}:${mm}`;
    }
  }

  dateChanged(isodate) {
    this.setState({ date: isodate, busy: true });
    this.getChildrenList(isodate);
  }

  setHours(childIndex) {
    //
  }

  hoursChanged(childIndex, range) {
    const children = this.state.children;
    const c = children[childIndex];
    c.hours[this.state.date] = [range[0]/60, range[1]/60];
  }

  render() {
    const openingHour = this.state.openingHours[0] * 60;
    const closingHour = this.state.openingHours[1] * 60;

    if (this.state.busy) {
      return <img className="centered" src="spinner.gif" />;
    }

    return (
      <Grid>
        <Row>
          <Col lg={8} lgOffset={2}>
            <DatePicker
              monthLabels={
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
              dayLabels={[ "Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam" ]}
              dateFormat="DD/MM/YYYY"
              value={this.state.date}
              showClearButton={false}
              onChange={this.dateChanged}
            />
          </Col>
        </Row>
        <Row>
          <Col lg={12}>
            {this.state.children.map((c, i) => {
                const cHours = c.hours[this.state.date];
                const hoursRange = cHours === undefined ? [this.state.openingHour, this.state.openingHour] : cHours;
                hoursRange[0] = hoursRange[0] * 60;
                hoursRange[1] = hoursRange[1] * 60;
               
                return (
                  <Row>
                    <Col lg={5}>
                      <h3>{c.surname + " " + c.name}</h3>
                    </Col>
                    <Col lg={5}>
                      <div style={{ marginTop: "20px" }}>
                        <ReactBootstrapSlider
                          value={hoursRange}
                          min={openingHour}
                          max={closingHour}
                          formatter={this.formatHour}
                          slideStop={(event)=>{ return this.hoursChanged(i, event.target.value)}}
                          rangeHighlights={
                            [
                              {
                                start: openingHour,
                                end: c.contractStart * 60
                              },
                              { start: c.contractEnd * 60, end: closingHour }
                            ]
                          }
                        />
                      </div>
                    </Col>
                    <Col lg={2}>
                      <div style={{ marginTop: "10px" }}>
                        <Button bsStyle="success" onClick={()=>{ this.setHours(i) }}>
                          <Glyphicon glyph="ok" />
                        </Button>
                        <Button bsStyle="danger" onClick={()=>{this.enableChange(i)}}>
                          <Glyphicon glyph="remove" />
                        </Button>
                      </div>
                    </Col>
                  </Row>
                );
              })}
          </Col>
        </Row>
      </Grid>
    );
  }
}
