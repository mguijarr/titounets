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
  Checkbox,
  DropdownButton,
  MenuItem
} from "react-bootstrap";
import ChildData from "./child.js";
import auth from "./auth";
import { checkStatus, parseJSON, formatHour } from "./utils";

export default class Heures extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = {
      busy: false,
      children: [],
      openingHours: [ 8, 19 ],
      date: new Date().toISOString(),
      showAll: false
    };

    this.dateChanged = this.dateChanged.bind(this);
    this.getChildrenList = this.getChildrenList.bind(this);
    this.setHours = this.setHours.bind(this);
    this.hoursChanged = this.hoursChanged.bind(this);
    this.toggleDisplay = this.toggleDisplay.bind(this);
  }

  toggleDisplay() {
    this.setState({ showAll: !this.state.showAll });
  }

  getChildrenList(date, keepBusy) {
    // get children list
    return fetch("/api/children/" + date, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        this.setState({ children: res.map((c)=>{
           c.disabled = c.hours !== null;
           return c
        }), busy: !!keepBusy });
      });
  }

  componentWillMount() {
    this.setState({ busy: true });
   
    const promises = [
      this.getChildrenList(this.state.date),
    
      // get opening hours
      fetch("/api/parameters", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      })
        .then(checkStatus)
        .then(parseJSON)
        .then(res => {
          this.setState({ openingHours: [res.opening, res.closing] });
        })
    ]

    Promise.all(promises).then(() => { this.setState({ busy: false })});
  }


  dateChanged(isodate) {
    this.setState({ date: isodate, busy: true });
    this.getChildrenList(isodate, false);
  }

  setHours(childIndex) {
    const children = this.state.children;
    const c = children[childIndex];
    fetch("/api/childHours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ "id": c.id, "name": c.name, "date": this.state.date, "hours": c.hours })
    })
      .then(checkStatus)
      .then(res => {
        children[childIndex].disabled = true;
        this.setState({ children });
      })
  }

  hoursChanged(childIndex, range) {
    const children = this.state.children;
    const c = children[childIndex];
    c.hours = [range[0]/60, range[1]/60];
    this.setState({ children });
  }

  render() {
    const openingHour = this.state.openingHours[0];
    const closingHour = this.state.openingHours[1];

    if (this.state.busy) {
      return <img className="centered" src="img/spinner.gif" />;
    }

    return (
      <Grid>
        <Row>
          <Col lg={5} lgOffset={2}>
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
          <Col lg={2} lgOffset={1}>
            <DropdownButton key="1" title={this.state.showAll ? "Afficher tous" : "Afficher selon contrat"}>
              <MenuItem eventKey="1" onClick={this.toggleDisplay}>{this.state.showAll ? "Afficher selon contrat" : "Afficher tous"}</MenuItem>
            </DropdownButton>
          </Col>
        </Row>
        <Row>
          <Col lg={12}>
            {this.state.children.map((c, i) => {
                if ((c.contractStart === null) && (! this.state.showAll)) { return "" };
                const start = c.contractStart !== null ? c.contractStart : openingHour;
                const end = c.contractEnd !== null ? c.contractEnd : closingHour;
                c.hours = c.hours || [start, end];
                const hoursRange = [c.hours[0]*60, c.hours[1]*60];
 
                return (
                  <Row>
                    <Col lg={5}>
                      <h3>{c.surname + " " + c.name}</h3>
                    </Col>
                    <Col lg={5}>
                      <div style={{ marginTop: "20px" }}>
                        <ReactBootstrapSlider
                          value={hoursRange}
                          min={openingHour*60}
                          max={closingHour*60}
                          formatter={formatHour}
                          disabled={this.state.children[i].disabled ? "disabled" : ""}
                          slideStop={(event)=>{ return this.hoursChanged(i, event.target.value)}}
                          rangeHighlights={
                            [
                              {
                                start: openingHour*60,
                                end: start*60
                              },
                              { start: end*60, end: closingHour*60 }
                            ]
                          }
                        />
                      </div>
                    </Col>
                    <Col lg={2}>
                      <div style={{ marginTop: "10px" }}>
                        <Button bsStyle="success" disabled={this.state.children[i].disabled} onClick={()=>{ this.setHours(i) }}>
                          <Glyphicon glyph="ok" />
                        </Button>
                        <Button disabled={!this.state.children[i].disabled} onClick={()=>{const children=this.state.children; children[i].disabled=false; this.setState({children})}}>
                          Editer
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
