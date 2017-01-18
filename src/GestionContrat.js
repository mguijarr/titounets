import React from 'react';
import moment from 'moment';
import 'moment-range';
import 'moment/locale/fr';
import { Calendar } from 'react-yearly-calendar';
import { Grid, Row, Col, Overlay, Popover, Button, Checkbox, Label, Glyphicon, Panel, Modal, DropdownButton, MenuItem, Table } from 'react-bootstrap';
import './css/GestionContrat.css!';
import './css/calendar.css!';
import auth from './auth';
import { isWeekend, isHoliday, checkStatus, parseJSON, findDays, getFamilyName } from './utils';
import 'pdfmake'; 
import 'pdfmake-fonts';
import Contract from './contrat';
import TimeTable from './timeTable';

export default class GestionContrat extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    let today = moment();
    let last_year = today.add(-1, "years");
    this.state = { busy: false, show: false, showEdit: false, holidays: [],
                   childPeriod: {},
                   currentRange: [last_year, last_year],
                   currentTimeTable: {},
                   name: "",
                   opening_time: "8",
                   closing_time: "20",
                   contractYear: 2016,
                   contractRange: moment.range(last_year, last_year),
                   enabled: false,
                   periods: [],
                   address: {},
                   familyId: -1,
                   family: {},
                   families: []
                 };
  
    this.childCheckbox = {}; 
    this.onPickRange = this.onPickRange.bind(this);
    this.addPeriod = this.addPeriod.bind(this);
    this.changePeriod = this.changePeriod.bind(this);
    this.savePeriods = this.savePeriods.bind(this);
    this.getPeriods = this.getPeriods.bind(this);
    this.checkChildForDay = this.checkChildForDay.bind(this);
    this.refinePeriods = this.refinePeriods.bind(this);
    this.deletePeriod = this.deletePeriod.bind(this);
    this.closeEdit = this.closeEdit.bind(this);
    this.familySelected = this.familySelected.bind(this);
    this.editContract = this.editContract.bind(this);
    this.contractYearPeriods = this.contractYearPeriods.bind(this);
    this.timeTableChanged = this.timeTableChanged.bind(this);
  }

  getPeriods(familyId) {
    this.setState({busy: true});
    fetch("/periods/"+familyId, {
        method: "GET",
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
      }).then(checkStatus).then(parseJSON).then((res) => {
        res.forEach((c) => { c.periods.forEach((p, i) => { c.periods[i]=moment.range(p.start, p.end); }) });
        this.setState({ busy: false, periods: res });
      });
  }

  componentWillMount() {
    moment.locale('fr');
    this.jours = moment.weekdays(true);

    this.setState({ busy: true });
    
    fetch("/parameters", {
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
    }).then(checkStatus).then(parseJSON).then((res) => {
        const contractStart = moment(new Date(res.contractStart));
        const contractEnd = moment(new Date(res.contractEnd));
        res.address.phone_number = res.phone_number;
        res.address.email = res.email;

        this.setState({ contractYear: contractStart.year(),
                        contractRange: moment.range(contractStart, contractEnd),
                        opening_time: res.opening,
                        closing_time: res.closing,
                        enabled: res.contractChangesAllowed === '1',
                        address: res.address,
                        name: res.name });
    });

    fetch("/holidays", {
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
    }).then(checkStatus).then(parseJSON).then((res) => {
        this.setState({ busy: false, holidays: res });
    });

    if (auth.admin()) {
      // get all families
      fetch("/families", {
            method: "GET",
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
      }).then(checkStatus).then(parseJSON).then((res) => {
            const family = {};
            res.forEach((f)=>{ family[f.id]=f });
            this.setState({ families: res.sort((a,b)=>{
              if (getFamilyName(a) < getFamilyName(b)) { return -1 } else { return 1 };
            }), family, busy:false });
      });
    } else if (auth.loggedIn()) {
      this.setState({familyId: auth.familyId()});

      this.getPeriods(auth.familyId());
    }
  }

  familySelected(familyId) {
    this.setState({familyId});
    this.getPeriods(familyId);  
  }

  refinePeriods(periods) {
    const nperiods = periods.length;
    for (let j = 0; j < periods.length; j++) {
      const a = periods[j].range;
      for (let k = 0; k < periods.length; k++) {
        if (j === k) { continue; }
        //if (JSON.stringify(periods[j].timetable) === JSON.stringify(periods[k].timetable)) {
          const b = periods[k].range;
          const aend = moment(a.end).add(1, 'd');
          let new_range;
          if (aend.isSame(b.start, 'day') || (isWeekend(aend) && moment(b.start).add(-2, 'd').isSame(aend, 'day'))) {
            new_range = moment.range(a.start, b.end);
          } else {
            // new_range will be null if the two ranges do not intersect
            new_range = a.add(b);
          }
          if (new_range != null) {
            periods[j] = { range: new_range, timetable: Object.assign(periods[j].timetable, periods[k].timetable) };
            periods.splice(k, 1);
          }
        //}
      }
    }
    if (periods.length < nperiods) { return this.refinePeriods(periods) } else { return periods };
  }

  addPeriod(child) {
    const p = this.state.periods;
    const new_range = moment.range(...this.state.currentRange); 
 
    if (Object.values(this.state.currentTimeTable).some((x)=>{return x})) {
      p.forEach((c) => {
        if (((child===undefined) && (this.childCheckbox[c.name].checked))||(child===c)) {
          c.periods.push({ range: new_range, timetable: this.state.currentTimeTable });
          //c.periods = this.refinePeriods(c.periods);
        }
      });
    }

    const currentRange = [moment().add(-1, 'years'), moment().add(-1, 'years')];
    this.setState({ show: false, currentRange, periods: p });
  }

  closeEdit() {
    this.setState({ showEdit: false, show: false });
  }

  deletePeriod(child, i) {
    const p = this.state.periods;

    child.periods.splice(i, 1);

    this.setState({ periods: p });
    this.closeEdit();
  }

  changePeriod(child, i) {
    this.deletePeriod(child, i);
    this.addPeriod(child);
  }

  savePeriods(familyId) {
    fetch("/periods/"+familyId, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(this.state.periods)
    });
  }

  onPickRange(start, end) {
    // find element with mouse cursor on it
    const q = document.querySelectorAll(':hover');
    const target = q[q.length - 1];
    if (moment(start).isAfter(moment(end))) {
      [start, end] = [end, start];
    }
    if (moment(start).isSame(moment(end))) {
      const childPeriod = {};
      let p = null;
      for(let i=0;i<this.state.periods.length;i++) {
        let child = this.state.periods[i];
        for (let j=0;j<child.periods.length;j++) {
          p = child.periods[j];
          if (moment(start).within(p.range)) {
            childPeriod[child.name] = p;
            break;
          }
        }
      }
      if (p) { 
        this.setState({ showEdit: true, currentRange: [p.range.start, p.range.end], childPeriod, target });
        return;
      }
    }
    if (this.state.periods.some((c)=>{ return c.periods.some((p)=>{return p.range.overlaps(moment.range(moment(start).add(-1,'days'),moment(end).add(1,"days")))}) })) {
      console.log("overlaps");
      return;
    }
    this.setState({ show: true, currentRange: [start, end], target });
  }


  checkChildForDay(day, child_index) {
    if (this.state.periods.length > child_index) {
      if (isWeekend(day)) { return false; }
      for (const p of this.state.periods[child_index].periods) {
        const r = moment.range(p.range.start, p.range.end)
        if ((day._isValid) && (day.within(r))) {
          if (p.timetable[day.weekday()+1]) { 
            return true;
          } 
        }
      }
    }

    return false;
  }

  contractYearPeriods(child_i) {
    return this.state.periods[child_i].periods.filter((x) => { return x.range.end.year() === this.state.contractYear });
  }

  editContract(familyId) {
    let c = new Contract();
    let f = this.state.family[this.state.familyId];
    let content = [];

    f.children.forEach((child, i) => {
      const periods = this.contractYearPeriods(i);
      if (periods.length > 0) {
          content.push(...c.getContents(this.state.name, this.state.address, this.state.contractRange, f, child, periods));
      }
    });

    let docDefinition = { 
      content,
      styles: {
          title: {
            fontSize: 16,
            bold: true,
            alignment: 'center'
          },
          centered: {
            alignment: 'center'
          },
          bigTitle: {
            fontSize: 20,
            bold: true,
            alignment: 'center'
          }
      },
      defaultStyle: { fontSize: 10 }
    }

     // open the PDF in a new window
     pdfMake.createPdf(docDefinition).open();

     // download the PDF
     //pdfMake.createPdf(docDefinition).download();
  }

  timeTableChanged(timetable) {
    this.setState({ currentTimeTable: timetable });
  }

  render() {
    this.childCheckbox = {}; 

    if (this.state.busy) {
      return <img className="centered" src="spinner.gif"/>
    }

    if ((!auth.admin()) && (!this.state.enabled)) {
      return <h3>Opération non disponible</h3> 
    }

    const pointerEventsCalendar = this.state.familyId >= 0 ? "auto" : "none";

    const customCss = {
      holiday: (day) => { return isHoliday(day, this.state.holidays); },
      weekend: isWeekend,
      unselectable: (day) => { return !day.within(this.state.contractRange) },
      today: (day) => { return moment().startOf('day').isSame(day, 'd'); },
      child1: (day) => { return this.checkChildForDay(day, 0) && !this.checkChildForDay(day, 1) && !this.checkChildForDay(day, 2); },
      child2: (day) => { return this.checkChildForDay(day, 1) && !this.checkChildForDay(day, 0) && !this.checkChildForDay(day, 2); },
      child3: (day) => { return this.checkChildForDay(day, 2) && !this.checkChildForDay(day, 0) && !this.checkChildForDay(day, 1); },
      child12: (day) => { return this.checkChildForDay(day, 0) && this.checkChildForDay(day, 1) && !this.checkChildForDay(day, 2); },
      child13: (day) => { return this.checkChildForDay(day, 0) && this.checkChildForDay(day, 2) && !this.checkChildForDay(day, 1); },
      child23: (day) => { return this.checkChildForDay(day, 1) && this.checkChildForDay(day, 2) && !this.checkChildForDay(day, 0); },
      child123: (day) => { return this.checkChildForDay(day, 0) && this.checkChildForDay(day, 1) && this.checkChildForDay(day, 2); },
      beginPeriod: (day) => {
        for (const child of this.state.periods) {
          for (const p of child.periods) {
            if (day.isSame(p.range.start)) { return true }
          }
        }
      },
      endPeriod: (day) => {
        for (const child of this.state.periods) {
          for (const p of child.periods) {
            if (day.isSame(p.range.end)) { return true }
          }
        }
      },
      period: (day) => {
        for (const child of this.state.periods) {
          for (const p of child.periods) {
            if (day.isSame(p.range.start) || day.isSame(p.range.end)) { return false; }
            if (day.within(p.range)) { return true; }
          }
        }
      }
    };

    const title = (<span><Glyphicon glyph="calendar" />{' ' + moment(this.state.currentRange[0]).format('L') + ' - ' + moment(this.state.currentRange[1]).format('L')}</span>);

    return (
      <Grid>
          <Row>
            <Col lg={1}><h4 style={{marginTop: '10px', marginBottom:'30px'}}>Famille:&nbsp;</h4></Col>
            <Col lg={11}>
              <DropdownButton title={ this.state.familyId >= 0 ? getFamilyName(this.state.family[this.state.familyId]) + " ("+this.state.familyId+")" : "Liste"} key={1}>
                {this.state.families.map((f, i) => { return <MenuItem eventKey={f.id} onSelect={this.familySelected}>{getFamilyName(f)+" ("+f.id+")"}</MenuItem> })}
              </DropdownButton>
              <div className="pull-right btn-toolbar">
                { auth.admin() ?
                    <Button bsStyle="info"  disabled={this.state.familyId < 0} onClick={()=>{ this.editContract(this.state.familyId) }}>Editer contrat</Button> : "" }
                <Button bsStyle="primary"  disabled={this.state.familyId < 0} onClick={()=>{ this.savePeriods(this.state.familyId) }}>Valider contrat</Button>
              </div>
            </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <div style={{position:'relative', textAlign: 'center', pointerEvents: pointerEventsCalendar}}>
              <Calendar ref="cal" year={this.state.contractYear} firstDayOfWeek={0} showWeekSeparators={false} selectRange selectedRange={this.state.currentRange} onPickRange={this.onPickRange} customClasses={customCss} />
            </div>
            <Overlay show={this.state.show} target={this.state.target} placement="right" container={this.refs.cal} containerPadding={20}>
              <Popover id="add_period_popover">
                <div className="text-right" style={{ padding: '-5px', marginBottom: '0.5em' }}>
                  <Button bsStyle="link" bsSize="xs" onClick={this.closeEdit}>Fermer&nbsp;<Glyphicon glyph="remove" /></Button>
                </div>
                {title}
                <div>
                  {this.state.periods.map((child,i) => { return <Checkbox key={i} defaultChecked inputRef={(c)=>{this.childCheckbox[child.name]=c}}>{child.name}</Checkbox>; })}
                  <div style={{ marginTop: '0.5em' }}>
                    <TimeTable days={findDays(this.state.currentRange)} openingTime={this.state.opening_time} closingTime={this.state.closing_time} onChange={this.timeTableChanged}/> 
                  </div>
                </div>
                <div style={{ marginTop: '1em' }} className="text-right">
                  <Button bsStyle="primary" onClick={(e) => { return this.addPeriod() }}>Ajouter p&eacute;riode</Button>
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
            { this.state.periods.map((child,i) => { return (<div style={{ marginTop: '0.5em' }}>
                <Checkbox key={i} checked={this.state.childPeriod[child.name]} inputRef={(c)=>{this.childCheckbox[child.name]=c}}>{child.name}>{child.name}</Checkbox>
                <TimeTable days={findDays(this.state.currentRange)} openingTime={this.state.opening_time} closingTime={this.state.closing_time} onChange={this.timeTableChanged}/>
            </div>); }) } 
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="primary" onClick={()=>{this.changePeriod(...this.state.childPeriod)}}>Changer</Button>
            <Button onClick={()=>{this.deletePeriod(...this.state.editedPeriod)}}>Supprimer</Button>
          </Modal.Footer>
        </Modal>
      </Grid>
    );
  }
}
