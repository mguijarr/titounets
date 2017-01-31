import React from "react";
import ReactDOM from "react-dom";
import DatePicker from "react-bootstrap-date-picker";
import { Calendar } from "react-yearly-calendar";
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
  Overlay,
  Popover,
  Checkbox,
  Nav,
  NavItem
} from "react-bootstrap";
import auth from "./auth";
import {
  isWeekend,
  isHoliday,
  isBankHoliday,
  checkStatus,
  parseJSON,
  AddressFields,
  getAddress,
  TimePicker
} from "./utils";
import moment from "moment";
import "moment-range";
import "moment/locale/fr";
import "./css/calendar.css!";

export default class Parametres extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    moment.locale("fr");

    const today = moment();
    const last_year = moment(today.add(-1, "years"));
    this.state = {
      currentTab: 0,
      currentRange: [ last_year, last_year ],
      closedPeriods: [],
      target: undefined,
      periodToDelete: -1,
      showDeletePeriod: false,
      holidays: [],
      busy: true,
      enableSave: false,
      openingHours: [ 8, 19 ],
      changesAllowed: false,
      applyCeiling: false,
      addressFields: {},
      contractStart: new Date().toISOString(),
      contractEnd: new Date().toISOString()
    };

    this.chkApplyCeiling = undefined;
    this.allowChanges = this.allowChanges.bind(this);
    this.setOpeningHour = this.setOpeningHour.bind(this);
    this.setClosingHour = this.setClosingHour.bind(this);
    this.save = this.save.bind(this);
    this.contractStartChanged = this.contractStartChanged.bind(this);
    this.contractEndChanged = this.contractEndChanged.bind(this);
    this.applyCeilingChanged = this.applyCeilingChanged.bind(this);
    this.addressChanged = this.addressChanged.bind(this);
    this.onPickRange = this.onPickRange.bind(this);
    this.handleTabSelect = this.handleTabSelect.bind(this);
    this.delPeriod = this.delPeriod.bind(this);
  }

  componentDidMount() {
    fetch("/api/holidays", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        this.setState({ holidays: res });
      });

    fetch("/api/parameters", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        this.setState({
          busy: false,
          name: res.name,
          closedPeriods: res.closedPeriods.map(p => {
            return moment.range(p);
          }),
          openingHours: [ res.opening, res.closing ],
          changesAllowed: res.contractChangesAllowed === "1",
          contractEnd: res.contractEnd != ""
            ? res.contractEnd
            : this.state.contractEnd,
          contractStart: res.contractStart != ""
            ? res.contractStart
            : this.state.contractStart,
          applyCeiling: res.applyCeiling === "1",
          addressFields: {
            address1: res.address.street[0],
            address2: res.address.street[1],
            zip: res.address.zip,
            city: res.address.city,
            phone_number: res.phone_number,
            email: res.email
          }
        });
      });
  }

  allowChanges() {
    fetch("/api/allowContractChanges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ allowChanges: !this.state.changesAllowed })
    })
      .then(checkStatus)
      .then(() => {
        this.setState({ changesAllowed: !this.state.changesAllowed });
      });
  }

  setOpeningHour(time) {
    const hours = this.state.openingHours;
    hours[0] = time;
    this.setState({ enableSave: true, openingHours: hours });
  }

  setClosingHour(time) {
    const hours = this.state.openingHours;
    hours[1] = time;
    this.setState({ enableSave: true, openingHours: hours });
  }

  addressChanged(key, value) {
    const addressFields = this.state.addressFields;
    addressFields[key] = value;

    this.setState({ enableSave: true, addressFields });
  }

  save() {
    fetch("/api/saveParameters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        contractChangesAllowed: this.state.changesAllowed ? "1" : "0",
        closing: this.state.openingHours[1],
        opening: this.state.openingHours[0],
        contractEnd: this.state.contractEnd,
        contractStart: this.state.contractStart,
        closedPeriods: this.state.closedPeriods.map(p => {
          return p.toString();
        }),
        applyCeiling: this.state.applyCeiling,
        ...getAddress(this.state.addressFields)
      })
    }).then(checkStatus).then(() => {
      this.setState({ enableSave: false });
    });
  }

  contractStartChanged(isodate) {
    this.setState({ enableSave: true, contractStart: isodate });
  }

  contractEndChanged(isodate) {
    this.setState({ enableSave: true, contractEnd: isodate });
  }

  applyCeilingChanged() {
    this.setState({
      enableSave: true,
      applyCeiling: this.chkApplyCeiling.checked
    });
  }

  onPickRange(start, end) {
    // find element with mouse cursor on it
    const q = document.querySelectorAll(":hover");
    const target = q[q.length - 1];
    if (moment(start).isAfter(moment(end))) {
      [ start, end ] = [ end, start ];
    }
    const closedPeriods = this.state.closedPeriods;
    if (moment(start).isSame(moment(end))) {
      if (closedPeriods.some((p, i) => {
          if (moment(start).within(p)) {
            this.setState({
              showDeletePeriod: true,
              periodToDelete: i,
              target
            });
            return true;
          }
          return false;
        }));
    }

    /*if (closedPeriods.some((p)=>{return p.overlaps(moment.range(moment(start).add(-1,'days'),moment(end).add(1,"days")))})) {
      // overlapping period
      return;
    }
    */
    const p = moment.range(start, end);
    closedPeriods.push(p);

    this.setState({
      enableSave: true,
      currentRange: [ start, end ],
      closedPeriods
    });
  }

  delPeriod(i) {
    const periods = this.state.closedPeriods;
    const today = moment();
    const last_year = moment(today.add(-1, "years"));

    periods.splice(i, 1);
    this.setState({
      enableSave: true,
      closedPeriods: periods,
      currentRange: [ last_year, last_year ]
    });
  }

  handleTabSelect(key) {
    this.setState({ currentTab: key });
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src="img/spinner.gif" />;
    }

    const contractYear = moment(this.state.contractStart).year();
    const openingHour = this.state.openingHours[0];
    const closingHour = this.state.openingHours[1];
    const contractRange = moment.range([
      moment(this.state.contractStart),
      moment(this.state.contractEnd)
    ]);

    const customCss = {
      holiday: day => {
        return isHoliday(day, this.state.holidays);
      },
      weekend: day => {
        return isWeekend(day) ||
          isBankHoliday(day) ||
          !day.within(contractRange);
      },
      closedDay: day => {
        return this.state.closedPeriods.some(p => {
          return moment(day).within(p);
        });
      }
    };

    let contents = "";
    if (this.state.currentTab == 0) {
      contents = (
        <div style={{ marginTop: "15px" }}>
          <Col lg={12}>
            <Form horizontal>
              <FormGroup>
                <Col sm={2} componentClass={ControlLabel}>
                  Nom de l'établissement
                </Col>
                <Col sm={4}>
                  <FormControl
                    readOnly={true}
                    type="text"
                    value={this.state.name}
                  />
                </Col>
              </FormGroup>
            </Form>
            <AddressFields
              valueChanged={this.addressChanged}
              formValues={this.state.addressFields}
            />
          </Col>
        </div>
      );
    } else if (this.state.currentTab == 1) {
      contents = (
        <div style={{ marginTop: "15px" }}>
          <Col lg={12}>
            <Form horizontal>
              <FormGroup>
                <Col sm={2} componentClass={ControlLabel}>
                  Tarif plafond CAF
                </Col>
                <Col sm={4}>
                  <Checkbox
                    inputRef={c => {
                        this.chkApplyCeiling = c;
                      }}
                    checked={this.state.applyCeiling}
                    onChange={this.applyCeilingChanged}
                  >Appliquer</Checkbox>
                </Col>
              </FormGroup>
              <FormGroup>
                <Col sm={2} componentClass={ControlLabel}>Heure ouverture</Col>
                <Col sm={4}>
                  <TimePicker
                    start="6"
                    end="21"
                    step="15"
                    value={openingHour}
                    onChange={this.setOpeningHour}
                  />
                </Col>
                <Col sm={2} componentClass={ControlLabel}>Heure fermeture</Col>
                <Col sm={4}>
                  <TimePicker
                    start="6"
                    end="21"
                    step="15"
                    value={closingHour}
                    onChange={this.setClosingHour}
                  />
                </Col>
              </FormGroup>
              <FormGroup>
                <Col sm={2} componentClass={ControlLabel}>Contrats du</Col>
                <Col sm={4}>
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
                    dayLabels={
                      [ "Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam" ]
                    }
                    dateFormat="DD/MM/YYYY"
                    value={this.state.contractStart}
                    showClearButton={false}
                    onChange={this.contractStartChanged}
                  />
                </Col>
                <Col sm={2} componentClass={ControlLabel}>au</Col>
                <Col sm={4}>
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
                    dayLabels={
                      [ "Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam" ]
                    }
                    dateFormat="DD/MM/YYYY"
                    value={this.state.contractEnd}
                    showClearButton={false}
                    onChange={this.contractEndChanged}
                  />
                </Col>
              </FormGroup>
            </Form>
            <div
              className="pull-right"
              style={{ marginTop: "15px", marginBottom: "15px" }}
            >
              <Button
                bsStyle={this.state.changesAllowed ? "danger" : "success"}
                onClick={this.allowChanges}
              >
                {
                  this.state.changesAllowed
                    ? "Fermer contrats"
                    : "Permettre les modifications de contrat"
                }
              </Button>
            </div>
          </Col>
        </div>
      );
    } else {
      contents = (
        <div
          style={
            { marginTop: "15px", position: "relative", textAlign: "center" }
          }
        >
          <Overlay
            show={this.state.showDeletePeriod}
            target={this.state.target}
            placement="right"
            container={this.refs.cal}
            containerPadding={20}
          >
            <Popover>
              <div
                className="text-right"
                style={{ padding: "-5px", marginBottom: "0.5em" }}
              >
                <Button
                  bsStyle="link"
                  bsSize="xs"
                  onClick={() => this.setState({ showDeletePeriod: false })}
                >
                  Fermer <Glyphicon glyph="remove" />
                </Button>
              </div>
              <Button
                bsStyle="primary"
                onClick={() => {
                    return this.delPeriod(this.state.periodToDelete);
                  }}
              >Supprimer période de fermeture</Button>
            </Popover>
          </Overlay>
          <Calendar
            ref="cal"
            year={contractYear}
            firstDayOfWeek={0}
            showWeekSeparators={true}
            selectRange
            selectedRange={this.state.currentRange}
            onPickRange={this.onPickRange}
            customClasses={customCss}
          />
        </div>
      );
    }

    return (
      <Grid>
        <Row>
          <div
            className="pull-right"
            style={{ marginTop: "15px", marginBottom: "15px" }}
          >
            <Button
              bsStyle="primary"
              disabled={!this.state.enableSave}
              onClick={this.save}
            >
              Enregistrer
            </Button>
          </div>
        </Row>
        <Row>
          <Nav
            bsStyle="tabs"
            activeKey={this.state.currentTab}
            onSelect={this.handleTabSelect}
          >
            <NavItem eventKey={0}>Général</NavItem>
            <NavItem eventKey={1}>Contrats</NavItem>
            <NavItem eventKey={2}>Jours de fermeture</NavItem>
          </Nav>
        </Row>
        <Row>
          {contents}
        </Row>
      </Grid>
    );
  }
}
