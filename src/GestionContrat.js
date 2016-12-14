import React from 'react';
import moment from 'moment';
import 'moment-range';
import 'moment/locale/fr';
import { Calendar, CalendarControls } from 'react-yearly-calendar';
import { Grid, Row, Col, Overlay, Popover, Button, Checkbox, Label, Glyphicon, Panel, Modal, DropdownButton, MenuItem } from 'react-bootstrap';
import TimePicker from 'react-bootstrap-time-picker';
import './css/GestionContrat.css!';
import auth from './auth';
import { checkStatus, parseJSON } from './utils';
import 'pdfmake'; 
import 'pdfmake-fonts';

export default class GestionContrat extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    let today = moment();
    let last_year = today.add(-1, "years");
    this.state = { busy: false, show: false, showEdit: false, holidays: [],
                   editedPeriod: null,
                   current_range: [last_year, last_year],
                   current_start_time: undefined,
                   current_end_time: undefined,
                   opening_time: "8",
                   closing_time: "20",
                   contractYear: 2016,
                   contractRange: moment.range(last_year, last_year),
                   enabled: false,
                   checked: {},
                   periods: [],
                   familyId: -1,
                   family: {},
                   families: []
                 };
   
    this.dayCheckbox = [null, null, null, null, null];
    this.onPickRange = this.onPickRange.bind(this);
    this.addPeriod = this.addPeriod.bind(this);
    this.changePeriod = this.changePeriod.bind(this);
    this.savePeriods = this.savePeriods.bind(this);
    this.getPeriods = this.getPeriods.bind(this);
    this.childClicked = this.childClicked.bind(this);
    this.checkChildForDay = this.checkChildForDay.bind(this);
    this.isWeekend = this.isWeekend.bind(this);
    this.refinePeriods = this.refinePeriods.bind(this);
    this.deletePeriod = this.deletePeriod.bind(this);
    this.editPeriod = this.editPeriod.bind(this);
    this.closeEdit = this.closeEdit.bind(this);
    this.handleStartTimeChange = this.handleStartTimeChange.bind(this);
    this.handleEndTimeChange = this.handleEndTimeChange.bind(this);
    this.findDays = this.findDays.bind(this);
    this.familySelected = this.familySelected.bind(this);
    this.editContract = this.editContract.bind(this);
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
        const checked = {};
        res.forEach((c) => { checked[c.name]=true; c.periods.forEach((p, i) => { c.periods[i]=moment.range(p.start, p.end); }) });
        this.setState({ busy: false, checked, periods: res });
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

        this.setState({ contractYear: contractStart.year(),
                        contractRange: moment.range(contractStart, contractEnd),
                        current_start_time: res.opening*3600,
                        current_end_time: res.closing*3600,
                        opening_time: res.opening,
                        closing_time: res.closing,
                        enabled: res.contractChangesAllowed === '1' });
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
            this.setState({ families: res, family, busy:false });
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
      const a = periods[j];
      for (let k = 0; k < periods.length; k++) {
        if (j === k) { continue; }
        const b = periods[k];
        if ((a.start.hour() == b.start.hour()) && (a.start.minute() == b.start.minute()) && (a.end.hour() == b.end.hour()) && (a.end.minute() == b.end.minute())) {
          const aend = moment(a.end).add(1, 'd');
          let new_range;
          if (aend.isSame(b.start, 'day') || (this.isWeekend(aend) && moment(b.start).add(-2, 'd').isSame(aend, 'day'))) {
            new_range = moment.range(a.start, b.end);
          } else {
            // new_range will be null if the two ranges do not intersect
            new_range = a.add(b);
          }
          if (new_range != null) {
            periods[j] = new_range;
            periods.splice(k, 1);
          }
        }
      }
    }
    if (periods.length < nperiods) { return this.refinePeriods(periods) } else { return periods };
  }

  addPeriod(child) {
    const p = this.state.periods;
    const new_range = moment.range(...this.state.current_range); 
    const ranges = [];
    const days = [false, false, false, false, false];
 
    this.findDays(new_range).forEach((d) => { days[d-1] = this.dayCheckbox[d-1].checked });
    
    let start = moment(new_range.start);
    let end = moment(new_range.start);
    end.add(-1, 'days'); // end is one day before start
    const he = Math.floor(this.state.current_end_time / 3600);
    const me = Math.floor((this.state.current_end_time - (he*3600)) / 60);
    end.hours(he).minutes(me).seconds(0);
    const hs = Math.floor(this.state.current_start_time / 3600);
    const ms = Math.floor((this.state.current_start_time - (hs*3600)) / 60);
    start.hours(hs).minutes(ms).seconds(0);
    
    new_range.by('days', (d) => {
      // grow range
      end.add(1, 'days');

      const dnum = d.isoWeekday() - 1;

      if ((dnum <= 4) && (! days[dnum])) {
        // skip this day
        end.add(-1, 'days');
        if (start.isSameOrBefore(end, 'day')) { 
          // we have a range: push it
          ranges.push(moment.range(start, end));
        }
        // new range
        // set start = day after this one
        // set end one day before start
        start = moment(d);
        start.add(1, 'days');
        end = moment(d); 
        end.hours(he).minutes(me).seconds(0);
        start.hours(hs).minutes(ms).seconds(0);
      } 
    });
    if (start.isSameOrBefore(end, 'day')) {
      // push last range, if any
      ranges.push(moment.range(start, end));
    }
    
    p.map((c, i) => {
      if (((child===undefined) && (this.state.checked[c.name]))||(child===c)) {
          p[i].periods.push(...ranges);
          p[i].periods = this.refinePeriods(p[i].periods);
      }
    });

    const current_range = [moment().add(-1, 'years'), moment().add(-1, 'years')];
    this.setState({ show: false, current_range, periods: p });
  }

  editPeriod(ev, child, i) {
    const r = [child.periods[i].start, child.periods[i].end];
    const current_start_time = child.periods[i].start.hour()*3600+child.periods[i].start.minute()*60;
    const current_end_time = child.periods[i].end.hour()*3600+child.periods[i].end.minute()*60;
    this.setState({ showEdit: true, current_range: r, current_start_time, current_end_time, editedPeriod: [child, i] });
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

  childClicked(name) {
    const checked = this.state.checked;
    checked[name] = !checked[name];
    this.setState({ checked });
  }

  onPickRange(start, end) {
    // find element with mouse cursor on it
    const q = document.querySelectorAll(':hover');
    const target = q[q.length - 1];
    if (moment(start).isAfter(moment(end))) {
      [start, end] = [end, start];
    }
    this.setState({ show: true, current_range: [start, end], target });
  }

  isWeekend(day) {
    return moment(day).endOf('week').add(-1, 'days').isSame(day, 'd') || moment(day).endOf('week').isSame(day, 'd');
  }

  checkChildForDay(day, child_index) {
    if (this.state.periods.length > child_index) {
      if (this.isWeekend(day)) { return false; }
      for (const p of this.state.periods[child_index].periods) {
        const r = moment.range(p.start, p.end)
        r.start.hour(0);
        r.start.minute(0);
        r.end.hour(0);
        r.end.minute(0);
        if ((day._isValid) && (day.within(r))) { return true; }
      }
    }

    return false;
  }

  handleStartTimeChange(time) {
    this.setState({ current_start_time: time });
  }

  handleEndTimeChange(time) {
    this.setState({ current_end_time: time });
  }

  findDays(period) {
    const days = {};
    // return array of days present in a period
    const range = moment.range(...this.state.current_range);
    range.by('days', (moment) => {
      const day = moment.isoWeekday();
      // iso day: 1=Monday, 7=Sunday
      if (day <= 5) { days[day]=true; } 
    });
    const daysArray = Object.keys(days);
    daysArray.sort();
    return daysArray;
  }

  editContract(familyId) {
    let docDefinition = { 
      content: [{  text: 'Crèche Halte Garderie - Les Titounets de Chartreuse', style: 'title' },
                {  text: 'address1', style: 'address' },
                {  text: 'address2', style: 'address' },
                {  text: 'cp - city', style: 'address' },
                {  text: 'phone / email', style: 'address' },
                ' ',
                {  text: "CONTRAT D'INSCRIPTION", style: 'bigTitle' },
                {  text: "période du 01/01/2017 au 31/07/2017", style: 'title' },
                ' ',
                {  columns: [
                {  text: 'Famille:', width: '20%' },
                   {  text: 'ACAJJAOUI / GUIJARRO',  width: '80%' } 
                ] },
                ' ',
                {  columns: [
                {  text: 'Adresse:', width: '20%' },
                   {  text: 'address1', width: '80%' }
                ] },
                {  columns: [
                {  text: ' ', width: '20%' },
                   {  text: 'address2', width: '80%' }
                ] },
                {  columns: [
                {  text: ' ', width: '20%' },
                   {  text: 'zip - city', width: '80%' }
                ] },
                ' ',
                {  columns: [
                {  text: 'N° allocataire:', width: '20%' },
                   {  text: '1137640', width: '80%' }
                ] }, 
                " ",
                "Les parents ou représentants légaux s'engagent par le présent contrat à confier la garde de leur enfant:",
                " ",
                { text: 'Elias', style: 'title' },
                { text: 'né(e) le 15/06/2013', style: 'address' },
                " ",
                "aux heures et jours suivants:"
                
      ],

      styles: {
        title: {
          fontSize: 18,
          bold: true,
          alignment: 'center'
        },
        address: {
          alignment: 'center'
        },
        bigTitle: {
          fontSize: 22,
          bold: true,
          alignment: 'center'
        },
        data: {
          bold: true,
          alignment: 'left'
        }
     }
   }

   // open the PDF in a new window
   pdfMake.createPdf(docDefinition).open();

   // download the PDF
   //pdfMake.createPdf(docDefinition).download();
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src="spinner.gif"/>
    }

    if ((!auth.admin()) && (!this.state.enabled)) {
      return <h3>Opération non disponible</h3> 
    }

    const customCss = {
      holiday: (day) => { for (const d of this.state.holidays) {
          if (day._isValid) {
            let st = new Date(d.start[0], d.start[1]-1, d.start[2]);
            let end= new Date(d.end[0], d.end[1]-1, d.end[2]);
            const r = moment.range(st, end);
            if (day.within(r)) { return true; } 
          }
        }
        return false;
      },
      weekend: this.isWeekend,
      unselectable: (day) => { return !day.within(this.state.contractRange) }, 
      today: (day) => { return moment().startOf('day').isSame(day, 'd'); },
      child1: (day) => { return this.checkChildForDay(day, 0) && !this.checkChildForDay(day, 1) && !this.checkChildForDay(day, 2); },
      child2: (day) => { return this.checkChildForDay(day, 1) && !this.checkChildForDay(day, 0) && !this.checkChildForDay(day, 2); },
      child3: (day) => { return this.checkChildForDay(day, 2) && !this.checkChildForDay(day, 0) && !this.checkChildForDay(day, 1); },
      child12: (day) => { return this.checkChildForDay(day, 0) && this.checkChildForDay(day, 1) && !this.checkChildForDay(day, 2); },
      child13: (day) => { return this.checkChildForDay(day, 0) && this.checkChildForDay(day, 2) && !this.checkChildForDay(day, 1); },
      child23: (day) => { return this.checkChildForDay(day, 1) && this.checkChildForDay(day, 2) && !this.checkChildForDay(day, 0); },
      child123: (day) => { return this.checkChildForDay(day, 0) && this.checkChildForDay(day, 1) && this.checkChildForDay(day, 2); },
    };

    const title = (<span><Glyphicon glyph="calendar" />{' ' + moment(this.state.current_range[0]).format('L') + ' - ' + moment(this.state.current_range[1]).format('L')}</span>);
    const contents = (
      <div>
        { this.state.showEdit ? (<Checkbox checked disabled>{this.state.editedPeriod[0].name}</Checkbox>) : 
        this.state.periods.map((child, i) => { return <Checkbox key={i} checked={this.state.checked[child.name]} onChange={(e) => this.childClicked(child.name)}>{child.name}</Checkbox>; })}
        <div>
          <span><Glyphicon glyph="time" />&nbsp;Heure&nbsp;d&eacute;but:</span>
          <TimePicker start={this.state.opening_time} end={this.state.closing_time} format={24} value={this.state.current_start_time} onChange={this.handleStartTimeChange}/>
        </div>
        <div style={{ marginTop: '0.5em' }}>
          <span><Glyphicon glyph="time" />&nbsp;Heure&nbsp;fin:</span>
          <TimePicker start={this.state.opening_time} end={this.state.closing_time} format={24} value={this.state.current_end_time} onChange={this.handleEndTimeChange}/>
        </div>
        <div style={{ marginTop: '0.5em' }}>
          { this.findDays(this.state.current_range).map((day,i) => { return <Checkbox key={'d'+i} defaultChecked inputRef={(chkbox)=>{this.dayCheckbox[day-1]=chkbox}}>{this.jours[day-1]}</Checkbox> }) }
        </div>
      </div>);

    return (
      <Grid>
        { auth.admin() ? (<Row>
            <Col lg={1}>
              <h4 style={{marginTop: '10px', marginBottom:'30px'}}>Famille:&nbsp;</h4>
            </Col>
            <Col lg={11}>
              <DropdownButton title={ this.state.familyId >= 0 ? this.state.family[this.state.familyId].parents[0] + " ("+this.state.familyId+")" : "Liste"} key={1}>
                {this.state.families.map((f, i) => { return <MenuItem eventKey={f.id} onSelect={this.familySelected}>{f.parents[0]+" ("+f.id+")"}</MenuItem> })}
              </DropdownButton>
            </Col>
        </Row>) : "" }
        <Row>
          <Col xs={12}>
            <Calendar ref="cal" year={this.state.contractYear} firstDayOfWeek={0} selectRange selectedRange={this.state.current_range} onPickRange={this.onPickRange} customClasses={customCss} />
            <Overlay show={this.state.show} target={this.state.target} placement="right" container={this.refs.cal} containerPadding={20}>
              <Popover id="add_period_popover">
                <div className="text-right" style={{ padding: '-5px', marginBottom: '0.5em' }}>
                  <Button bsStyle="link" bsSize="xs" onClick={this.closeEdit}>Fermer&nbsp;<Glyphicon glyph="remove" /></Button>
                </div>
                <div>
                {title}
                {contents}
                </div>
                <div style={{ marginTop: '1em' }} className="text-right">
                  <Button bsStyle="primary" onClick={(e) => { return this.addPeriod() }}>Ajouter p&eacute;riode</Button>
                </div>
              </Popover>
            </Overlay>
          </Col>
        </Row>
        <Row>
          <div style={{ marginTop: '20px' }}>
          <Col xs={12}>
            <Panel header="P&eacute;riodes">
                <div id="periods">
                    { this.state.periods.map((child, i) => { return child.periods.map((r, j) => { return r.end.year() === this.state.contractYear ? (<span style={{ display: 'inline-block', cursor: 'pointer' }}><Label bsStyle="primary" onClick={(ev) => { this.editPeriod(ev, child, j); }}>{child.name}: {r.start.format('L')} - {r.end.format('L')}, de {r.start.format('HH:mm')} à {r.end.format('HH:mm')}&nbsp;&nbsp;<Glyphicon glyph="remove" onClick={(ev) => { ev.stopPropagation(); this.deletePeriod(child, j); }} /></Label></span>) : ""; }); }) }
		</div>
            </Panel>
          </Col>
          </div>
        </Row>
        <Row>
          <Col sm={12}>
            <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
              <Button bsStyle="primary"  disabled={this.state.familyId < 0} onClick={()=>{ this.savePeriods(this.state.familyId) }}>Valider contrat</Button>
            </div>
          </Col>
          { auth.admin() ? (<Col sm={12}>
            <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
              <Button bsStyle="info"  disabled={this.state.familyId < 0} onClick={()=>{ this.editContract(this.state.familyId) }}>Editer contrat</Button>
            </div>
          </Col>) : "" }
        </Row>
        <Modal show={this.state.showEdit} onHide={this.closeEdit}>
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {contents}
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="primary" onClick={()=>{this.changePeriod(...this.state.editedPeriod)}}>Changer</Button>
            <Button onClick={()=>{this.deletePeriod(...this.state.editedPeriod)}}>Supprimer</Button>
          </Modal.Footer>
        </Modal>
      </Grid>
    );
  }
}
