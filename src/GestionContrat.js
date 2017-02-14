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
      closedPeriods: [],
      address: {},
      saveEnabled: false,
      family: null
    };

    this.onPickRange = this.onPickRange.bind(this);
    this.addPeriod = this.addPeriod.bind(this);
    this.changePeriod = this.changePeriod.bind(this);
    this.savePeriods = this.savePeriods.bind(this);
    this.getPeriods = this.getPeriods.bind(this);
    this.checkChildForDay = this.checkChildForDay.bind(this);
    this.deletePeriod = this.deletePeriod.bind(this);
    this.closeEdit = this.closeEdit.bind(this);
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
    //this.setState({ busy: true });
    return fetch("/api/periods/" + familyId, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        for (const childName of Object.keys(res)) {
            res[childName].forEach(p => {
              p.range = moment.range(p.range.start, p.range.end);
            });
        }
        // periods in the form: { childName: [ { range: xxx, timetable: { "2": [hStart, hEnd], ... } }, ...], ... }
        this.setState({ periods: res, busy: false });
      });
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ busy: true });
    this.getPeriods(nextProps.family.id);
  }

  componentWillMount() {
    moment.locale("fr");
    this.jours = moment.weekdays(true);

    this.setState({ busy: true });

    const promises = [
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
      }),

    fetch("/api/holidays", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        this.setState({ holidays: res });
      }),
      this.getPeriods(this.props.family.id)]

    Promise.all(promises).then(() => { this.setState({busy: false })});
  }

  addPeriod() {
    const periods = this.state.periods;
    const ranges = [];
    if (this.holidaysCheckbox.checked) {
        const r = moment.range(...this.state.currentRange);
        let start = moment(r.start);
        let end = moment(r.start);
        let current_range = null;
        r.by("day", (d) => {
            if (isHoliday(d, this.state.holidays)) {
                if (current_range != null) {
                  ranges.push(current_range);
                }
                current_range = null;
                end.add(1, "days");
                start = moment(end);
            } else {
                current_range = moment.range(start, end);
                end.add(1, "days"); 
            }
        });
        if (current_range != null) {
          ranges.push(current_range);
        }
    } else {
        ranges.push(moment.range(...this.state.currentRange));
    }

    for (const childName of Object.keys(periods)) {
      if (this.childCheckbox[childName].checked) {
        ranges.forEach((newRange) => {
          periods[childName].push({
            range: newRange,
            timetable: this.state.editedTimeTable[childName]
          });
        });
      }
    }

    this.setState({ periods, saveEnabled: true });
    this.closeEdit();
  }

  closeEdit() {
    const currentRange = [
      moment().add(-1, "years"),
      moment().add(-1, "years")
    ];

    this.setState({ show: false, currentRange, showEdit: false });
  }

  deletePeriod(editedPeriod) {
    const periods = this.state.periods;
    for (const childName of Object.keys(editedPeriod)) {
      const i = editedPeriod[childName];
      const p = periods[childName];

      p.splice(i, 1);
    }

    this.setState({ periods, saveEnabled: true });
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
    this.setState({ saveEnabled: false });
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
    const childName = Object.keys(this.props.family.children)[childIndex];
    if (childName === undefined) { return false };
    const child = this.props.family.children[childName]; 
    if ((child.present === undefined) || (child.present === "1")) {
      if (isClosed(day, this.state.closedPeriods)) {
        return false;
      }
      for (const p of this.state.periods[child.name]) {
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

  editContract() {
    let c = new Contract();
    let f = this.props.family;
    let content = [];

    Object.keys(f.children).forEach(childName => {
      const child = f.children[childName];
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
      return <img className="centered" src="img/spinner.gif" />;
    }

    if (!auth.admin() && !this.state.enabled) {
      return <h3>Opération non disponible</h3>;
    }

    const pointerEventsCalendar = this.props.family.id >= 0 ? "auto" : "none";

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
          <Col lg={12}>
            <div className="pull-right" style={{marginTop: "15px", marginBottom:"15px"}}>
              <Button
                bsStyle="primary"
                disabled={(this.props.family.id < 0) || (! this.state.saveEnabled)}
                onClick={() => {
                    this.savePeriods(this.props.family.id);
                  }}
              >Enregistrer contrat</Button>
              {auth.admin() ? "    " : ""}
              {auth.admin() ? <Button
                    bsStyle="primary"
                    disabled={this.props.family.id < 0}
                    onClick={() => {
                        this.editContract(this.props.family.id);
                      }}
                  >Editer contrat</Button> : ""}
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
                   <Checkbox
                      defaultChecked={false}
                      inputRef={c => {
                          this.holidaysCheckbox = c;
                        }}
                    >Omettre vacances scolaires</Checkbox>
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
            <Checkbox
              defaultChecked={false}
              inputRef={c => {
                this.holidaysCheckbox = c;
              }}
            >Omettre vacances scolaires</Checkbox>
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
