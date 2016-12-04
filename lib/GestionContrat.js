import React from 'react';
import moment from 'moment';
import 'moment-range';
import 'moment/locale/fr';
import { Calendar, CalendarControls } from 'react-yearly-calendar';
import { Grid, Row, Col, Overlay, Popover, Button, Checkbox, Label, Glyphicon, Panel, Modal } from 'react-bootstrap';
import TimePicker from 'react-bootstrap-time-picker';
import './GestionContrat.css!';
import 'isomorphic-fetch';
import auth from './auth';

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    var error = new Error(response.statusText)
    error.response = response
    throw error
  }
}

function parseJSON(response) {
  return response.json()
}


export default class GestionContrat extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = { show: false, showEdit: false, holidays: [],
                   current_range: [moment().add(-1, 'years'), moment().add(-1, 'years')],
                   current_start_time: 8 * 3600,
                   current_end_time: 18 * 3600,
                   checked: {},
                   periods: [],
                 };
    this.onPickRange = this.onPickRange.bind(this);
    this.addPeriod = this.addPeriod.bind(this);
    this.savePeriods = this.savePeriods.bind(this);
    this.chilClicked = this.childClicked.bind(this);
    this.checkChildForDay = this.checkChildForDay.bind(this);
    this.isWeekend = this.isWeekend.bind(this);
    this.refinePeriods = this.refinePeriods.bind(this);
    this.deletePeriod = this.deletePeriod.bind(this);
    this.editPeriod = this.editPeriod.bind(this);
    this.closeEdit = this.closeEdit.bind(this);
    this.handleTimeChange = this.handleTimeChange.bind(this);
  }

  componentWillMount() {
    moment.locale('fr');
   
    fetch("/holidays", {
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
    }).then(checkStatus).then(parseJSON).then((res) => {
        this.setState({ holidays: res });
    });

    if (auth.loggedIn()) {
      fetch("/periods/"+auth.familyId(), {
        method: "GET",
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
      }).then(checkStatus).then(parseJSON).then((res) => {
        const checked = {};
        res.forEach((c) => { checked[c.name]=true; c.periods.forEach((p, i) => { c.periods[i]=moment.range(p.start, p.end); }) }); 
        this.setState({ checked, periods: res });
      });
    }
  }

  refinePeriods(periods) {
    for (let j = 0; j < periods.length; j++) {
      const a = periods[j];
      for (let k = 0; k < periods.length; k++) {
        if (j === k) { continue; }
        const b = periods[k];
        let new_range = null;
        const aend = moment(a.end).add(1, 'd');
        if (aend.isSame(b.start) || (this.isWeekend(aend) && moment(b.start).add(-2, 'd').isSame(aend))) {
          new_range = moment.range(a.start, b.end);
        } else {
          new_range = a.add(b);
        }
        if (new_range != null) {
          periods[j] = new_range;
          periods.splice(k, 1);
          return this.refinePeriods(periods);
        }
      }
    }
    return periods;
  }

  addPeriod(e) {
    const p = this.state.periods;

    p.map((child, i) => {
      if (this.state.checked[child.name]) {
        const new_range = moment.range(...this.state.current_range);
        p[i].periods.push(new_range);

        p[i].periods = this.refinePeriods(p[i].periods);
      }
    });

    const current_range = [moment().add(-1, 'years'), moment().add(-1, 'years')];
    this.setState({ show: false, current_range, periods: p });
  }

  editPeriod(ev, child, i) {
    const r = [child.periods[i].start, child.periods[i].end];
    this.setState({ showEdit: true, current_range: r });
  }

  closeEdit() {
    this.setState({ showEdit: false, show: false });
  }

  deletePeriod(child, i) {
    const p = this.state.periods;

    child.periods.splice(i, 1);

    this.setState({ periods: p });
  }

  savePeriods() {
    fetch("/periods/"+auth.familyId(), {
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
    this.setState({ show: true, current_range: [start, end], target });
  }

  isWeekend(day) {
    return moment(day).endOf('week').add(-1, 'days').isSame(day, 'd') || moment(day).endOf('week').isSame(day, 'd');
  }

  checkChildForDay(day, child_index) {
    if (this.state.periods.length > child_index) {
      if (this.isWeekend(day)) { return false; }
      for (const p of this.state.periods[child_index].periods) {
        if ((day._isValid) && (day.within(p))) { return true; }
      }
    }

    return false;
  }

  handleTimeChange(time, child) {
  }

  render() {
    const customCss = {
      holiday: (day) => { for (const d of this.state.holidays) {
        if (day._isValid) {
          const r = moment.range(moment(d.start).add(-1, 'months'), moment(d.end).add(-1, 'months'));
          if (day.within(r)) { return true; }
        }
      }
        return false;
      },
      weekend: this.isWeekend,
      // cannot select day before 1st of september
      //unselectable: (day) => { return day.isBefore(moment([day.year(), 8, 1])); },
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
        {this.state.periods.map((child, i) => { return <Checkbox key={i} checked={this.state.checked[child.name]} onChange={(e) => this.childClicked(child.name)}>{child.name}</Checkbox>; })}
        <div>
          <span><Glyphicon glyph="time" />&nbsp;Heure&nbsp;d&eacute;but:</span>
          <TimePicker start="8" end="19" format={24} value={this.state.current_start_time} onChange={this.handleTimeChange} />
        </div>
        <div style={{ marginTop: '0.5em' }}>
          <span><Glyphicon glyph="time" />&nbsp;Heure&nbsp;fin:</span>
          <TimePicker start="8" end="19" format={24} value={this.state.current_end_time} onChange={this.handleTimeChange} />
        </div>
        <div style={{ marginTop: '0.5em' }}>
          <Checkbox defaultChecked={true}>Lundi</Checkbox>          
          <Checkbox defaultChecked={true}>Mardi</Checkbox>          
          <Checkbox defaultChecked={true}>Mercredi</Checkbox>          
          <Checkbox defaultChecked={true}>Jeudi</Checkbox>          
          <Checkbox defaultChecked={true}>Vendredi</Checkbox>          
        </div>
      </div>);

    return (
      <Grid>
        <Row>
          <Col xs={12}>
            <Calendar ref="cal" year={2016} firstDayOfWeek={0} selectRange selectedRange={this.state.current_range} onPickRange={this.onPickRange} customClasses={customCss} />
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
                  <Button bsStyle="primary" onClick={this.addPeriod}>Ajouter p&eacute;riode</Button>
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
                    { this.state.periods.map((child, i) => { return child.periods.map((r, j) => { const p = r.toDate(); return <span style={{ display: 'inline-block', cursor: 'pointer' }}><Label bsStyle="primary" onClick={(ev) => { this.editPeriod(ev, child, j); }}>{child.name}: {moment(p[0]).format('L')} - {moment(p[1]).format('L')}&nbsp;&nbsp;<Glyphicon glyph="remove" onClick={() => { this.deletePeriod(child, j); }} /></Label></span>; }); }) }
		</div>
            </Panel>
          </Col>
          </div>
        </Row>
        <Row>
          <Col sm={12}>
            <div className="pull-right" style={{ marginTop: '15px', marginBottom: '15px' }}>
              <Button bsStyle="primary"  onClick={this.savePeriods}>Valider contrat</Button>
            </div>
          </Col>
        </Row>
        <Modal show={this.state.showEdit} onHide={this.closeEdit}>
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {contents}
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="primary" onClick={this.changePeriod}>Changer</Button>
            <Button onClick={this.deletePeriod}>Supprimer</Button>
          </Modal.Footer>
        </Modal>
      </Grid>
    );
  }
}
