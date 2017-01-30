import React from "react";
import moment from "moment";
import "moment-range";
import "moment/locale/fr";
import { Calendar } from "react-yearly-calendar";
import {
  Grid,
  Row,
  Col,
  Overlay,
  Popover,
  Button,
  Checkbox,
  Label,
  Glyphicon,
  Panel,
  Modal,
  DropdownButton,
  MenuItem,
  Table
} from "react-bootstrap";
import "./css/GestionContrat.css!";
import "./css/calendar.css!";
import auth from "./auth";
import {
  isClosed,
  isHoliday,
  checkStatus,
  parseJSON,
  findDays,
  getFamilyName
} from "./utils";
import "pdfmake";
import "pdfmake-fonts";
import Contract from "./contrat";
import TimeTable from "./timeTable";

export default class GestionContrat extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    let today = moment();
    let last_year = today.add(-1, "years");
    this.state = {
      busy: false,
      show: false,
      showEdit: false,
      holidays: [],
      editedPeriod: {},
      currentRange: [ last_year, last_year ],
      editedTimeTable: {},
      name: "",
      openingTime: 0,
      closingTime: 0,
      contractYear: 2016,
      contractRange: moment.range(last_year, last_year),
      enabled: false,
      periods: {},
      childOrder2Name: {},
      address: {},
      familyId: -1,
      family: {},
      families: []
    };

    this.onPickRange = this.onPickRange.bind(this);
    this.addPeriod = this.addPeriod.bind(this);
    this.changePeriod = this.changePeriod.bind(this);
    this.savePeriods = this.savePeriods.bind(this);
    this.getPeriods = this.getPeriods.bind(this);
    this.checkChildForDay = this.checkChildForDay.bind(this);
    this.deletePeriod = this.deletePeriod.bind(this);
    this.closeEdit = this.closeEdit.bind(this);
    this.familySelected = this.familySelected.bind(this);
    this.editContract = this.editContract.bind(this);
    this.contractYearPeriods = this.contractYearPeriods.bind(this);
    this.timeTableChanged = this.timeTableChanged.bind(this);
    this.findDays = this.findDays.bind(this);
  }

  findDays(period) {
    const days = [undefined,undefined,undefined,undefined,undefined];
    if (period === undefined) {
      findDays(this.state.currentRange).forEach((d)=>{ days[d-1] = [this.state.openingTime, this.state.closingTime]; });
    } else {
      for (const d in period.timetable) {
        days[d-1] = period.timetable[d];
      }
    }
    return days; 
  }

  getPeriods(familyId) {
    this.setState({ busy: true });
    fetch("/api/periods/" + familyId, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        const childOrder2Name = {};
        let i = 0;
        for (const childName of Object.keys(res)) {
          childOrder2Name[i] = childName; i++;
          res[childName].forEach(p => {
            p.range = moment.range(p.range.start, p.range.end);
          });
        }
        // periods in the form: { childName: [ { range: xxx, timetable: { "2": [hStart, hEnd], ... } }, ...], ... }
        this.setState({ busy: false, childOrder2Name, periods: res });
      });
  }

  componentWillMount() {
    moment.locale("fr");
    this.jours = moment.weekdays(true);

    this.setState({ busy: true });

    fetch("/api/parameters", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        const contractStart = moment(new Date(res.contractStart));
        const contractEnd = moment(new Date(res.contractEnd));
        res.address.phone_number = res.phone_number;
        res.address.email = res.email;

        this.setState({
          contractYear: contractStart.year(),
          contractRange: moment.range(contractStart, contractEnd),
          openingTime: res.opening,
          closingTime: res.closing,
          closedPeriods: res.closedPeriods.map(p => {
            return moment.range(p);
          }),
          enabled: res.contractChangesAllowed === "1",
          address: res.address,
          name: res.name
        });
      });

    fetch("/api/holidays", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        this.setState({ busy: false, holidays: res });
      });

    if (auth.admin()) {
      // get all families
      fetch("/api/families", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      })
        .then(checkStatus)
        .then(parseJSON)
        .then(res => {
          const family = {};
          res.forEach(f => {
            family[f.id] = f;
          });
          this.setState({
            families: res.sort((a, b) => {
              if (getFamilyName(a) < getFamilyName(b)) {
                return -1;
              } else {
                return 1;
              }
            }),
            family,
            busy: false
          });
        });
    } else if (auth.loggedIn()) {
      this.setState({ familyId: auth.familyId() });

      this.getPeriods(auth.familyId());
    }
  }

  familySelected(familyId) {
    this.setState({ familyId });
    this.getPeriods(familyId);
  }

  addPeriod() {
    const periods = this.state.periods;
    const newRange = moment.range(...this.state.currentRange);

    for (const childName of Object.keys(periods)) {
      if (this.childCheckbox[childName].checked) {
        periods[childName].push({
          range: newRange,
          timetable: this.state.editedTimeTable[childName]
        });
      }
    }

    const currentRange = [
      moment().add(-1, "years"),
      moment().add(-1, "years")
    ];

    this.setState({ show: false, currentRange, periods });
  }

  closeEdit() {
    this.setState({ showEdit: false, show: false });
  }

  deletePeriod(editedPeriod) {
    const periods = this.state.periods;
    for (const childName of Object.keys(editedPeriod)) {
      const i = editedPeriod[childName];
      const p = periods[childName];

      p.splice(i, 1);
    }

    this.setState({ periods });
    this.closeEdit();
  }

  changePeriod(editedPeriod) {
    this.deletePeriod(editedPeriod);
    this.addPeriod();
  }

  savePeriods(familyId) {
    fetch("/api/periods/" + familyId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(this.state.periods)
    });
  }

  onPickRange(start, end) {
    // find element with mouse cursor on it
    const q = document.querySelectorAll(":hover");
    const target = q[q.length - 1];
    if (moment(start).isAfter(moment(end))) {
      [ start, end ] = [ end, start ];
    }
    if (moment(start).isSame(moment(end))) {
      const editedPeriod = {};
      let p = null;
      for (const childName of Object.keys(this.state.periods)) {
        const periods = this.state.periods[childName];
        for (let j = 0; j < periods.length; j++) {
          p = periods[j];
          if (moment(start).within(p.range)) {
            editedPeriod[childName] = j;
            break;
          }
        }
      }
      if (Object.keys(editedPeriod).length > 0) {
        this.setState({
          showEdit: true,
          currentRange: [ p.range.start, p.range.end ],
          editedPeriod,
          target
        });
        return;
      }
    }
    const pickedRange = moment.range(
              moment(start).add(-1, "days"),
              moment(end).add(1, "days")
            )

    if (Object.keys(this.state.periods).some(childName => {
        return this.state.periods[childName].some(p => {
          return p.range.overlaps(pickedRange);
        });
      })) {
      console.log("overlaps");
      return;
    }
    this.setState({ show: true, currentRange: [ start, end ], target });
  }

  checkChildForDay(day, childIndex) {
    if (Object.keys(this.state.childOrder2Name).length > childIndex) {
      if (isClosed(day, this.state.closedPeriods)) {
        return false;
      }
      const childName = this.state.childOrder2Name[childIndex];
      for (const p of this.state.periods[childName]) {
        if (day._isValid && day.within(p.range)) {
          if (p.timetable[day.weekday() + 1]) {
            return true;
          }
        }
      }
    }

    return false;
  }

  contractYearPeriods(childName) {
    return this.state.periods[childName].filter(p => {
      return p.range.end.year() === this.state.contractYear;
    });
  }

  editContract(familyId) {
    let c = new Contract();
    let f = this.state.family[this.state.familyId];
    let content = [];

    f.children.forEach(child => {
      const periods = this.contractYearPeriods(child.name);
      if (periods.length > 0) {
        content.push(
          ...c.getContents(
            this.state.name,
            this.state.address,
            this.state.contractRange,
            this.state.closedPeriods,
            f,
            child,
            periods
          )
        );
      }
    });
  
    let docDefinition = {
      content,
      styles: {
        title: { fontSize: 16, bold: true, alignment: "center" },
        centered: { alignment: "center" },
        bigTitle: { fontSize: 20, bold: true, alignment: "center" }
      },
      defaultStyle: { fontSize: 10 }
    };

    // open the PDF in a new window
    pdfMake.createPdf(docDefinition).open();
    // download the PDF
    //pdfMake.createPdf(docDefinition).download();
  }

  timeTableChanged(timetable, childName) {
    const editedTimeTable = this.state.editedTimeTable;
    if (childName === undefined) {
      for (const childName of Object.keys(this.state.periods)) {
          editedTimeTable[childName] = timetable;
      }
    } else {
      editedTimeTable[childName] = timetable;
    }
    this.setState({ editedTimeTable });
  }

  render() {
    this.childCheckbox = {};

    if (this.state.busy) {
      return <img className="centered" src="spinner.gif" />;
    }

    if (!auth.admin() && !this.state.enabled) {
      return <h3>Opération non disponible</h3>;
    }

    const pointerEventsCalendar = this.state.familyId >= 0 ? "auto" : "none";

    const customCss = {
      holiday: day => {
        return isHoliday(day, this.state.holidays);
      },
      unselectable: day => {
        return isClosed(day, this.state.closedPeriods) || !day.within(this.state.contractRange);
      },
      today: day => {
        return moment().startOf("day").isSame(day, "d");
      },
      child1: day => {
        return this.checkChildForDay(day, 0) &&
          !this.checkChildForDay(day, 1) &&
          !this.checkChildForDay(day, 2);
      },
      child2: day => {
        return this.checkChildForDay(day, 1) &&
          !this.checkChildForDay(day, 0) &&
          !this.checkChildForDay(day, 2);
      },
      child3: day => {
        return this.checkChildForDay(day, 2) &&
          !this.checkChildForDay(day, 0) &&
          !this.checkChildForDay(day, 1);
      },
      child12: day => {
        return this.checkChildForDay(day, 0) &&
          this.checkChildForDay(day, 1) &&
          !this.checkChildForDay(day, 2);
      },
      child13: day => {
        return this.checkChildForDay(day, 0) &&
          this.checkChildForDay(day, 2) &&
          !this.checkChildForDay(day, 1);
      },
      child23: day => {
        return this.checkChildForDay(day, 1) &&
          this.checkChildForDay(day, 2) &&
          !this.checkChildForDay(day, 0);
      },
      child123: day => {
        return this.checkChildForDay(day, 0) &&
          this.checkChildForDay(day, 1) &&
          this.checkChildForDay(day, 2);
      },
      beginPeriod: day => {
        for (const childName of Object.keys(this.state.periods)) {
          for (const p of this.state.periods[childName]) {
            if (day.isSame(p.range.start)) {
              return true;
            }
          }
        }
      },
      endPeriod: day => {
        for (const childName of Object.keys(this.state.periods)) {
          for (const p of this.state.periods[childName]) {
            if (day.isSame(p.range.end)) {
              return true;
            }
          }
        }
      },
      period: day => {
        for (const childName of Object.keys(this.state.periods)) {
          for (const p of this.state.periods[childName]) {
            if (day.isSame(p.range.start) || day.isSame(p.range.end)) {
              return false;
            }
            if (day.within(p.range)) {
              return true;
            }
          }
        }
      }
    };

    const title = (
      <span>
        <Glyphicon glyph="calendar" />
        {
          " " +
            moment(this.state.currentRange[0]).format("L") +
            " - " +
            moment(this.state.currentRange[1]).format("L")
        }
      </span>
    );

    return (
      <Grid>
        <Row>
          <Col lg={1}>
            <h4 style={{ marginTop: "10px", marginBottom: "30px" }}>
              Famille:
            </h4>
          </Col>
          <Col lg={11}>
            <DropdownButton
              title={
                this.state.familyId >= 0
                  ? getFamilyName(this.state.family[this.state.familyId]) +
                    " (" +
                    this.state.familyId +
                    ")"
                  : "Liste"
              }
              key={1}
            >
              {this.state.families.map((f, i) => {
                  return (
                    <MenuItem eventKey={f.id} onSelect={this.familySelected}>
                      {getFamilyName(f) + " (" + f.id + ")"}
                    </MenuItem>
                  );
                })}
            </DropdownButton>
            <div className="pull-right btn-toolbar">
              {auth.admin() ? <Button
                    bsStyle="info"
                    disabled={this.state.familyId < 0}
                    onClick={() => {
                        this.editContract(this.state.familyId);
                      }}
                  >Editer contrat</Button> : ""}
              <Button
                bsStyle="primary"
                disabled={this.state.familyId < 0}
                onClick={() => {
                    this.savePeriods(this.state.familyId);
                  }}
              >Valider contrat</Button>
            </div>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <div
              style={
                {
                  position: "relative",
                  textAlign: "center",
                  pointerEvents: pointerEventsCalendar
                }
              }
            >
              <Calendar
                ref="cal"
                year={this.state.contractYear}
                firstDayOfWeek={0}
                showWeekSeparators={false}
                selectRange
                selectedRange={this.state.currentRange}
                onPickRange={this.onPickRange}
                customClasses={customCss}
              />
            </div>
            <Overlay
              show={this.state.show}
              target={this.state.target}
              placement="right"
              container={this.refs.cal}
              containerPadding={20}
            >
              <Popover id="add_period_popover">
                <div
                  className="text-right"
                  style={{ padding: "-5px", marginBottom: "0.5em" }}
                >
                  <Button bsStyle="link" bsSize="xs" onClick={this.closeEdit}>
                    Fermer <Glyphicon glyph="remove" />
                  </Button>
                </div>
                {title}
                <div>
                  {Object.keys(this.state.periods).map((childName, i) => {
                      return (
                        <Checkbox
                          key={i}
                          defaultChecked
                          inputRef={c => {
                              this.childCheckbox[childName] = c;
                            }}
                        >{childName}</Checkbox>
                      );
                    })}
                  <div style={{ marginTop: "0.5em" }}>
                    <TimeTable
                      days={this.findDays()}
                      openingTime={this.state.openingTime}
                      closingTime={this.state.closingTime}
                      onChange={this.timeTableChanged}
                    />
                  </div>
                </div>
                <div style={{ marginTop: "1em" }} className="text-right">
                  <Button
                    bsStyle="primary"
                    onClick={e => {
                        return this.addPeriod();
                      }}
                  >Ajouter période</Button>
                </div>
              </Popover>
            </Overlay>
          </Col>
        </Row>
        <Modal show={this.state.showEdit} onHide={this.closeEdit}>
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {Object.keys(this.state.periods).map((childName, i) => {
                const periodIndex = this.state.editedPeriod[childName];
                const period = this.state.periods[childName][periodIndex];

                return (
                  <div style={{ marginTop: "0.5em" }}>
                    <Checkbox
                      key={i}
                      defaultChecked={periodIndex!==undefined}
                      inputRef={c => {
                          this.childCheckbox[childName] = c;
                        }}
                    >{childName}</Checkbox>
                    <TimeTable
                      days={this.findDays(period)}
                      openingTime={this.state.openingTime}
                      closingTime={this.state.closingTime}
                      onChange={(timetable)=>this.timeTableChanged(timetable, childName)}
                    />
                  </div>
                );
              })}
          </Modal.Body>
          <Modal.Footer>
            <Button
              bsStyle="primary"
              onClick={() => {
                  this.changePeriod(this.state.editedPeriod);
                }}
            >Changer</Button>
            <Button
              onClick={() => {
                  this.deletePeriod(this.state.editedPeriod);
                }}
            >Supprimer</Button>
          </Modal.Footer>
        </Modal>
      </Grid>
    );
  }
}
