import React from "react";
import Moment from "moment";
import { extendMoment } from "moment-range";
import {
  Grid,
  Row,
  Col,
  Overlay,
  Popover,
  Button,
  ButtonToolbar,
  Checkbox,
  Label,
  Glyphicon,
  Panel,
  Modal,
  DropdownButton,
  MenuItem,
  Table,
  FormGroup,
  ControlLabel,
  FormControl,
  Form
} from "react-bootstrap";
import auth from "./auth";
import {
  isClosed,
  isHoliday,
  checkStatus,
  parseJSON,
  findDays,
  formatHour,
  DatePicker,
  downloadBill
} from "./utils";
import Contract from "./contrat";
import spinner from "./img/spinner.gif";

const moment = extendMoment(Moment);

export default class Factures extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    let today = moment();
    let last_year = today.add(-1, "years");
    this.state = {
      busy: true,
      contractStart: last_year,
      contractEnd: last_year,
      currentMonth: 0, 
      bills: {},
      parameters: {},
      changed: false,
      childHours: {},
      periods: {},
      rate: {},
      showSubmitBill: false
    };

    this.addLine = this.addLine.bind(this);
    this.removeLine = this.removeLine.bind(this);
    this.selectMonth = this.selectMonth.bind(this);
    this.hoursChanged = this.hoursChanged.bind(this);
    this.desChanged = this.descChanged.bind(this);
    this.save = this.save.bind(this);
    this.getData = this.getData.bind(this);
    this.editBill = this.editBill.bind(this);
    this.childPeriods = this.childPeriods.bind(this);
    this.adjustHour = this.adjustHour.bind(this);
    this.getChildHours = this.getChildHours.bind(this);
    this.hasPeriods = this.hasPeriods.bind(this);
    this.makeBill = this.makeBill.bind(this);
    this.submitBill = this.submitBill.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.family.id !== nextProps.family.id) {
      this.getData(nextProps.family.id);
    }
  }

  componentWillMount() {
    this.getData(this.props.family.id);
  }

  getData(familyId) {
    this.setState({ busy: true });

    const promises = [fetch("/api/childHours/" + familyId, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(childHours => {
      this.setState({ childHours });
    }),
    fetch("/api/periods/" + familyId, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(res => {
      this.setState({ periods: res.periods, rate: res.rate });
    }),
    fetch("/api/bills/" + familyId, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(res => {
      const parameters = res.parameters;
      const contractStart = moment(new Date(parameters.contractStart));
      const contractEnd = moment(new Date(parameters.contractEnd));
      const year = contractStart.year();
      parameters.closedPeriods = res.parameters.closedPeriods.map(p => {
        return moment.range(p);
      });
      const bills = res.bills[year] || {};
      res.bills[year] = bills;
      this.setState({ parameters, currentMonth: moment().month(), changed: false, bills: res.bills, year, contractStart, contractEnd });
    })];

    Promise.all(promises).then(() => { this.setState({busy: false}) });
  }

  save() {
    fetch("/api/bills/" + this.props.family.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(this.state.bills)
    }).then(checkStatus).then(() => { this.setState({ changed: false }) });
  }

  addLine(month, childName) {
    const bills = this.state.bills;
    bills[month.year()][month.format('MMMM')][childName].push({ hours: "", desc: "" });
    this.setState({ bills });
  }

  removeLine(month, childName, i) {
    const bills = this.state.bills;
    const bill = bills[month.year()][month.format("MMMM")][childName];
    if (bill.length > 1) {
      bill.splice(i, 1);
      this.setState({ bills, changed: true }); 
    } else {
      bill[i].hours = "";
      bill[i].desc = "";
      this.setState({ bills, changed: true });
    }
  }

  selectMonth(i) {
    this.setState({ currentMonth: i });
  }

  hoursChanged(month, childName, i, hours) {
    const bills = this.state.bills;
    bills[month.year()][month.format("MMMM")][childName][i].hours = hours;
    this.setState({ bills, changed: true });
  }

  descChanged(month, childName, i, desc) {
    const bills = this.state.bills;
    bills[month.year()][month.format("MMMM")][childName][i].desc = desc;
    this.setState({ bills, changed: true });
  }

  childPeriods(childName, year) {
    const childPeriods = [];
    Object.keys(this.state.periods).forEach(pChildName => {
          if (pChildName === childName) {
            this.state.periods[childName].forEach(p => {
              p.range = moment.range(p.range.start, p.range.end);
              if (p.range.end.year() === year) {
                childPeriods.push(p);
              }
            });
          }
        });
    return childPeriods;
  }

  submitBill(month) {
    const bill = this.makeBill(month);

    alert(bill.billAmount.toPay);

    this.setState({ showSubmitBill: false });
  }

  editBill(month) {
    const bill = this.makeBill(month); 

    downloadBill(bill.content);
  }
 
  makeBill(month) {
    const bill = new Contract(this.props.family);
    const monthName = month.format("MMMM");
    const params = this.state.parameters;
    const address = params.address;
    address.phone_number = params.phone_number;
    address.email = params.email;
    const content = [];
    const rate = Number(this.state.rate.rate || bill.calcRate().rate).toFixed(2);
    const billAmount = {};

    // periods in the form: { childName: [ { range: xxx, timetable: { "2": [hStart, hEnd], ... } }, ...], ... }
    Object.keys(this.props.family.children).map(childName => {
      const child = this.props.family.children[childName];
      if (child.present === '1') {
        const childPeriods = this.childPeriods(childName, this.state.year);

        if (content.length > 1) { content.push({text: "", pageBreak: "after"}) };
        if (childPeriods.length === 0) {
          // heures reelles
          const childHours = this.getChildHours(childName);
          if (childHours.length > 0) {
            content.push(
              ...bill.getHoursBill(params.name, address, monthName, this.state.year, childName, childHours, rate, billAmount)
            );
          }     
        } else {
          const { periods, nMonths, nDays, nHours } = bill.getPeriodsMonthsDaysHours(childPeriods, this.state.parameters.closedPeriods, moment.range(this.state.contractStart, this.state.contractEnd)); //this.state.contractRange);
          const hoursByMonth = (nHours / nMonths).toFixed(2); 
          const monthlyAmount = (rate * hoursByMonth).toFixed(2);

          const data = [];

          const childHours = this.getChildHours(childName, childPeriods);
          childHours.forEach((x) => {
            const c1 = Number(x.contractHours[0]);
            const c2 = Number(x.contractHours[1]);
            const h1 = Number(x.arriving);
            const h2 = Number(x.leaving);
            const hs = h2-c2+c1-h1;
            data.push({ desc: x.day+", "+formatHour(x.arriving*60)+"->"+formatHour(x.leaving*60)+" (contrat: "+formatHour(c1*60)+"->"+formatHour(c2*60)+")", hours: hs.toFixed(2) }); 
          });

          this.state.bills[month.year()][monthName][childName].forEach((d) => {
            data.push(d);
          });
          
          content.push(
            ...bill.getBill(params.name, address, monthName, this.state.year, childName, hoursByMonth, rate, monthlyAmount, data, billAmount)
          );
        }
      }
    });

    return { content, billAmount };
  }

  adjustHour(h, d) {
    const opening = Number(this.state.parameters.opening);
    const closing = Number(this.state.parameters.closing);
    let H = 0;
    d = d || 1;
    if (d < 0) {
      H = Math.floor(h);
      if ((h - H) > 0.5) { H+=0.5; }
    } else {
      H = Math.ceil(h);
      if ((H - h) > 0.5) { H-=0.5; }
    }
    if (H < opening) { H = opening; }
    if (H > closing) { H = closing; }
    return H;
  }

  getChildHours(childName, periods) {
    const childHours = this.state.childHours[childName] || {};
    const res = [];
    Object.keys(childHours).forEach((day) => {
      const hours = childHours[day];
      const m = moment(day, "YYYY-MM-DD");
      if ((m.year() === this.state.year) && (m.month() === this.state.currentMonth)) {
        if (periods != undefined) {
          for (let p of periods) {
            if (p.range.contains(m)) {
              const contractHours = p.timetable[m.day()];
              if (contractHours === null) { break; }
              let skip = true;
              let arriving = contractHours[0]*60;
              let leaving = contractHours[1]*60;
              const c1 = formatHour(arriving);
              const c2 = formatHour(leaving);
              //console.log("c1 "+c1+", c2 "+c2);
              const h1 = formatHour(hours[0]*60);
              const h2 = formatHour(hours[1]*60);
              //console.log("h1 "+h1+", h2 "+h2);
              if (((hours[0]*60) - arriving) < -5) {
                arriving = 60*this.adjustHour(hours[0], -1);
                skip = false;
              }
              if (((hours[1]*60) - leaving) > 5) {
                leaving = 60*this.adjustHour(hours[1]);
                skip = false;
              }
              if (! skip) { 
                const a = formatHour(arriving);
                const d = formatHour(leaving);
                arriving = arriving/60.
                leaving = leaving/60.
                res.push({ day: m.format("DD-MM-YYYY"), label1: `${a} (${h1}), contrat: ${c1}`, arriving, label2: `${d} (${h2}), contrat: ${c2}`, leaving, contractHours });
              }
              break;
            } 
          } 
        } else {
          const h1 = formatHour(hours[0]*60);
          const h2 = formatHour(hours[1]*60);
          const arriving = this.adjustHour(hours[0], -1);
          const leaving = this.adjustHour(hours[1]);
          const a = formatHour(60*arriving);
          const d = formatHour(60*leaving);
          res.push({ day: m.format("DD-MM-YYYY"), label1: `${a} (${h1})`, arriving, label2: `${d} (${h2})`, leaving });
        }
      }
    });
    //console.log(res);
    return res;
  }

  hasPeriods(periods, hours) {
    const month = this.state.currentMonth;
    for (const day of Object.keys(hours)) {
      const d = moment(day);
      if (d.month() === month) {
        for (const p of periods) {
          if (p.range.contains(d)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src={spinner} />
    }

    const months = [];
    const year = this.state.year;
    const bills = this.state.bills[year];
    const contractRange = moment.range(this.state.contractStart, this.state.contractEnd);
    for (const mm of contractRange.by("month")) {
      const m = mm.format('MMMM');
      months.push(mm);
      bills[m] = bills[m] || {};
    }
    const currentMonthName = months[this.state.currentMonth] ? months[this.state.currentMonth].format("MMMM") : ""; 

    return (
      <Grid>
        <p></p>
        <Form horizontal>
          <FormGroup>
            <Col sm={1} componentClass={ControlLabel}>
              Mois de 
            </Col>
            <Col sm={2}>
              <DropdownButton id="current-month" title={currentMonthName}>
                {months.map((m, i) => <MenuItem key={i} onSelect={()=>this.selectMonth(i)}>{m.format('MMMM')}</MenuItem>)}
              </DropdownButton>
            </Col>
            <Col sm={9}>
              <ButtonToolbar className="pull-right">
                <Button bsStyle="primary" disabled={!this.state.changed} onClick={this.save}>
                  <Glyphicon glyph="save"/>{' '}Enregistrer
                </Button> 
                <Button bsStyle="primary" onClick={()=>this.editBill(months[this.state.currentMonth])}>
                  <Glyphicon glyph="print"/>{' '}Imprimer
                </Button>
              </ButtonToolbar>
            </Col>
          </FormGroup>
          <FormGroup>
            <Col sm={12}>
              <ButtonToolbar className="pull-right">
                <Button bsStyle="primary" onClick={()=>this.setState({ showSubmitBill: true })}>
                  <Glyphicon glyph="piggy-bank"/>{' '}Soumettre
                </Button>
              </ButtonToolbar>
            </Col>
          </FormGroup>
        </Form>
        <hr />
        {Object.keys(this.props.family.children).map((childName, i) => {
            const child = this.props.family.children[childName];
            if (child.present === "0") { return "" }
            const childPeriods = this.childPeriods(childName, year);
            const childHours = this.state.childHours[childName] || {};
            if (! this.hasPeriods(childPeriods, childHours)) { return <div>
              <p></p>
              <Row><Col sm={6}><h4><Label>{childName}</Label></h4></Col><Col sm={6}><h4>facturation en heures de présence</h4></Col></Row>
              <Row><Col sm={12}>
              <Table striped bordered condensed hover>
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Arrivée</th>
                    <th>Départ</th>
                  </tr>
                </thead>
                <tbody>
                  {this.getChildHours(childName).map(h => {
                      return <tr><th>{h.day}</th><th>{h.label1}</th><th>{h.label2}</th></tr>
                  })}
                </tbody>
              </Table>
              </Col></Row>
            </div>;
           } else {
            bills[currentMonthName][childName] = bills[currentMonthName][childName] || [{ hours: "", desc: "" }];
            const bill = bills[currentMonthName][childName];
            return child.present === "0" ? "" : <div>
              <p></p>
              <Row><Col sm={6}><h4><Label>{childName}</Label></h4></Col><Col sm={6}><h4>facturation au contrat</h4></Col></Row>
              <Row><Col sm={12}><h5>1. report automatique des heures supplémentaires realisées</h5></Col></Row>
              <Row><Col sm={12}>
              <Table striped bordered condensed hover>
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Arrivée</th>
                    <th>Départ</th>
                  </tr>
                </thead>
                <tbody>
                  {this.getChildHours(childName, childPeriods).map(h => {
                      return <tr><th>{h.day}</th><th>{h.label1}</th><th>{h.label2}</th></tr>
                  })}
                </tbody>
              </Table>
              </Col></Row>
              <Row><Col sm={12}><h5>2. saisie manuelle</h5></Col></Row>
              <Row>
              {bill.map((line, i) =>
                <Form horizontal>
                  <FormGroup>
                    <Col sm={3} componentClass={ControlLabel}>
                      Heures supplémentaires ou en déduction
                    </Col>
                    <Col sm={2}>
                      <FormControl
                        readOnly={!auth.admin()}
                        type="text"
                        value={line.hours}
                        onChange={(e)=>this.hoursChanged(months[this.state.currentMonth], childName, i, e.target.value)}
                      />
                    </Col>
                    <Col sm={1} componentClass={ControlLabel}>
                      Libellé
                    </Col>
                    <Col sm={4}>
                      <FormControl
                        readOnly={!auth.admin()}
                        type="text"
                        value={line.desc}
                        onChange={(e)=>this.descChanged(months[this.state.currentMonth], childName, i, e.target.value)}
                      />
                    </Col>
                    <Col sm={2}>
                      <ButtonToolbar className="pull-right">
                        <Button onClick={()=>this.addLine(months[this.state.currentMonth], childName)}><Glyphicon glyph="plus"/></Button>
                        <Button onClick={()=>this.removeLine(months[this.state.currentMonth], childName, i)}><Glyphicon glyph="minus"/></Button>
                      </ButtonToolbar>
                    </Col>
                  </FormGroup>
              </Form>)}
              </Row>
            </div>} }) }
            <Modal show={this.state.showSubmitBill} onHide={()=>this.setState({showSubmitBill: false})}>
              <Modal.Header closeButton>
                <Modal.Title>Soumettre facture</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                Etes-vous sûr d'envoyer l'ordre de paiement ?
              </Modal.Body>
              <Modal.Footer>
                <Button
                  onClick={()=>this.setState({showSubmitBill: false})}
                >Annuler</Button>
                <Button bsStyle="primary"
                  onClick={()=>this.submitBill(months[this.state.currentMonth])}
                >Confirmer</Button>
              </Modal.Footer>
           </Modal>
      </Grid>
    );
  }
}
