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
  getHours,
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
      bills: {},
      currentMonth: 0,
      months: new Map(),
      parameters: {},
      changed: false,
      childrenHours: {},
      periods: {},
      rate: {},
      showSubmitBill: false
    };

    this.addLine = this.addLine.bind(this);
    this.removeLine = this.removeLine.bind(this);
    this.hoursChanged = this.hoursChanged.bind(this);
    this.desChanged = this.descChanged.bind(this);
    this.save = this.save.bind(this);
    this.archiveBill = this.archiveBill.bind(this);
    this.getData = this.getData.bind(this);
    this.editBill = this.editBill.bind(this);
    this.childPeriods = this.childPeriods.bind(this);
    this.getChildHours = this.getChildHours.bind(this);
    this.makeBill = this.makeBill.bind(this);
    this.submitBill = this.submitBill.bind(this);
    this.getBillMonths = this.getBillMonths.bind(this);
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

    const promises = [fetch("/api/childrenHours/" + familyId, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(childrenHours => {
      this.setState({ childrenHours });
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
      this.setState({ parameters, changed: false, bills: res.bills, year, contractStart, contractEnd });
    })];

    Promise.all(promises).then(() => { this.setState({busy: false}, ()=>this.setState({months: this.getBillMonths(this.state.year)})); });
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

  childPeriods(childName, year, month) {
    const childPeriods = [];
    Object.keys(this.state.periods).forEach(pChildName => {
          if (pChildName === childName) {
            this.state.periods[childName].forEach(p => {
              p.range = moment.range(p.range.start, p.range.end);
              if (p.range.end.year() === year) {
                if ((month === undefined) || ((p.range.start.month() <= month) && (p.range.end.month() >= month))) {
                  childPeriods.push(p);
                }
              }
            });
          }
        });
    return childPeriods;
  }

  archiveBill(year, month, bill) {
   const bills = {}

   Object.keys(this.props.family.children).forEach((childName, i) => {
        const child = this.props.family.children[childName];
        if (child.present != "0") {
          const tmp = {};
          getHours(this.state.childrenHours[childName] || {}, this.state.periods[childName], month, year, this.state.parameters.opening, this.state.parameters.closing, tmp);
          bills[childName] = { "hoursDone": tmp.done.toFixed(2), "hoursCharged" : tmp.paid.toFixed(2), "bill":  bill }
        }
    });

    fetch("/api/bills/"+this.props.family.id+"/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ "year": year, "month": month, bills})
    });
  }

  submitBill(month) {
    if (month === undefined) { month = this.state.months.get(this.state.currentMonth); }
    
    const bill = this.makeBill(month);

    this.save();
    
    this.archiveBill(this.state.year, this.state.currentMonth, bill);

    this.setState({ showSubmitBill: false });
  }

  editBill(month) {
    if (month === undefined) { month = this.state.months.get(this.state.currentMonth); }
       
    const bill = this.makeBill(month); 
    
    this.save();
    
    this.archiveBill(this.state.year, this.state.currentMonth, bill);

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
    const amount = { };

    // periods in the form: { childName: [ { range: xxx, timetable: { "2": [hStart, hEnd], ... } }, ...], ... }
    Object.keys(this.props.family.children).map(childName => {
      const child = this.props.family.children[childName];
      if (child.present === '1') {
        const inContract = this.state.contractStart.month() <= this.state.currentMonth && this.state.contractEnd.month() >= this.state.currentMonth;
        const childPeriods = inContract ? this.childPeriods(childName, this.state.year) : [];

        if (content.length > 1) { content.push({text: "", pageBreak: "after"}) };
        if (childPeriods.length === 0) {
          // heures reelles
          const childHours = this.getChildHours(childName, [], month.month());
          if (childHours.length > 0) {
            content.push(
              ...bill.getHoursBill(params.name, address, monthName, this.state.year, childName, childHours, rate, amount)
            );
          }     
        } else {
          const { periods, nMonths, nDays, nHours } = bill.getPeriodsMonthsDaysHours(childPeriods, this.state.parameters.closedPeriods, moment.range(this.state.contractStart, this.state.contractEnd)); 
          const hoursByMonth = (nHours / nMonths).toFixed(2); 

          const data = [];

          const childHours = this.getChildHours(childName, childPeriods, month.month());
          childHours.forEach((x) => {
            const c1 = Number(x.contractHours[0]);
            const c2 = Number(x.contractHours[1]);
            const cmsg = (c1+c2 > 0) ?  " (contrat: "+formatHour(60*c1)+"->"+formatHour(60*c2)+")" : " (hors contrat)"; 
            const h1 = Number(x.arriving);
            const h2 = Number(x.leaving);
            const hs = h2-c2+c1-h1;
            data.push({ desc: x.day+", "+formatHour(x.arriving*60)+"->"+formatHour(x.leaving*60)+cmsg, hours: hs.toFixed(2) }); 
          });

          const bills = this.state.bills[month.year()][monthName][childName]; 
          if (bills != undefined) {
            bills.forEach((d) => {
              data.push(d);
            });
          }
          
          content.push(
            ...bill.getBill(params.name, address, monthName, this.state.year, childName, hoursByMonth, rate, data, amount)
          );
        }
      }
    });

    return { content, amount };
  }

  getChildHours(childName, periods, month) {
    if (month === undefined) { month = this.state.currentMonth; }
    const childHours = this.state.childrenHours[childName] || {};
    return getHours(childHours, periods, month, this.state.year, this.state.parameters.opening, this.state.parameters.closing, {});
  }

  getBillMonths(year) {
      const months = new Map();
      Object.keys(this.props.family.children).forEach(childName => {
        const childHours = this.state.childrenHours[childName] || {};
        for (let i=0; i<12; i++) {
          const childPeriods = this.childPeriods(childName, year, i);
          const m = moment();
          m.set('year', year);
          m.set('month', i);
          m.set('date', 1);
          if (childPeriods.length > 0) {
            months.set(i, m);
          } else {
            if (this.getChildHours(childName, [], i).length > 0) {
              months.set(i, m);
            }
          } 
        };
      });
      return months;
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src={spinner} />
    }

    const year = this.state.year;
    const bill = this.state.bills[year] || {};
    const currentMonth = this.state.months.get(this.state.currentMonth);
    const monthsList = [];
    let currentMonthName = "";
 
    for (let [i, m] of this.state.months) {
      const monthName = m.format('MMMM');
      if (i === this.state.currentMonth) { currentMonthName = monthName; }
      bill[monthName] = bill[monthName] || {};
      monthsList.push(<MenuItem key={i} onSelect={()=>this.setState({ currentMonth: i }) }>{monthName}</MenuItem>);
    }

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
                {monthsList}
              </DropdownButton>
            </Col>
            <Col sm={9}>
              <ButtonToolbar className="pull-right">
                <Button bsStyle="primary" disabled={!this.state.changed} onClick={this.save}>
                  <Glyphicon glyph="save"/>{' '}Enregistrer
                </Button> 
                <Button bsStyle="primary" onClick={()=>this.editBill()}>
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
            bill[childName] = bill[childName] || [{ hours: "", desc: "" }];
            const childPeriods = this.childPeriods(childName, year, this.state.currentMonth);
            const childHours = this.state.childrenHours[childName] || {};
            if (childPeriods.length === 0) { return <div key={i}>
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
                  {this.getChildHours(childName, []).map((h,i) => {
                      return <tr key={10+i}><th>{h.day}</th><th>{h.label1}</th><th>{h.label2}</th></tr>
                  })}
                </tbody>
              </Table>
              </Col></Row>
            </div>;
           } else {
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
                  {this.getChildHours(childName, childPeriods).map((h,i) => {
                      return <tr key={10+i}><th>{h.day}</th><th>{h.label1}</th><th>{h.label2}</th></tr>
                  })}
                </tbody>
              </Table>
              </Col></Row>
              <Row><Col sm={12}><h5>2. saisie manuelle</h5></Col></Row>
              <Row>
              {bill[childName].map((line, i) =>
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
                        onChange={(e)=>this.hoursChanged(currentMonth, childName, i, e.target.value)}
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
                        onChange={(e)=>this.descChanged(currentMonth, childName, i, e.target.value)}
                      />
                    </Col>
                    <Col sm={2}>
                      <ButtonToolbar className="pull-right">
                        <Button onClick={()=>this.addLine(currentMonth, childName)}><Glyphicon glyph="plus"/></Button>
                        <Button onClick={()=>this.removeLine(currentMonth, childName, i)}><Glyphicon glyph="minus"/></Button>
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
                  onClick={()=>this.submitBill()}
                >Confirmer</Button>
              </Modal.Footer>
           </Modal>
      </Grid>
    );
  }
}
