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
  formatHour
} from "./utils";
import "../node_modules/pdfmake/build/pdfmake.min.js";
import "../node_modules/pdfmake/build/vfs_fonts.js";
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
      rate: {}
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
      //const contractRange = moment.range(contractStart, contractEnd);
      const year = contractStart.year();
      parameters.closedPeriods = res.parameters.closedPeriods.map(p => {
        return moment.range(p);
      });
      const bills = res.bills[year] || {};
      res.bills[year] = bills;
      this.setState({ parameters, currentMonth: 0, changed: false, bills: res.bills, year, contractStart, contractEnd });
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

  editBill(month) {
    const bill = new Contract(this.props.family);
    const monthName = month.format("MMMM");
    const params = this.state.parameters;
    const address = params.address;
    address.phone_number = params.phone_number;
    address.email = params.email;
    const content = [];
    const rate = this.state.rate.rate || bill.calcRate().rate;

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
              ...bill.getHoursBill(params.name, address, monthName, this.state.year, childName, childHours, rate)
            );
          }     
        } else {
          const { periods, nMonths, nDays, nHours } = bill.getPeriodsMonthsDaysHours(childPeriods, this.state.parameters.closedPeriods, moment.range(this.state.contractStart, this.state.contractEnd)); //this.state.contractRange);
          const monthlyAmount = (rate * (nHours / nMonths)).toFixed(2);

          content.push(
            ...bill.getBill(params.name, address, monthName, this.state.year, childName, nHours.toString(), rate, monthlyAmount, this.state.bills[month.year()][monthName][childName])
          );
        }
      }
    });

    let docDefinition = {
      content,
      styles: {
        title: { fontSize: 16, bold: true, alignment: "center" },
        centered: { alignment: "center" },
        bigTitle: { fontSize: 20, bold: true, alignment: "center" },
        marginTop: 20, marginBottom: 20, marginLeft: 20, marginRight: 20
      },
      defaultStyle: { fontSize: 10 },
      pageBreakBefore: (currentNode, followingNodesOnPage, nodesOnNextPage, previousNodesOnPage) => {
        return currentNode.startPosition.top >= 750;
      }
    }
    if (content.length > 0) { pdfMake.createPdf(docDefinition).download(); }
  }

  adjustHour(h, d) {
    let H = 0;
    d = d || 1;
    if (d < 0) {
      H = Math.floor(h);
      if ((h - H) > 0.5) { H+=0.5; }
    } else {
      H = Math.ceil(h);
      if ((H - h) > 0.5) { H-=0.5; }
    }
    if (H < this.state.parameters.opening) { H = this.state.parameters.opening; }
    if (H > this.state.parameters.closing) { H = this.state.parameters.closing; }
    return H;
  }

  getChildHours(childName) {
    const childHours = this.state.childHours[childName] || {};
    const res = [];
    Object.keys(childHours).forEach((day) => {
      const hours = childHours[day];
      const m = moment(day, "YYYY-MM-DD");
      const h1 = formatHour(hours[0]*60);
      const h2 = formatHour(hours[1]*60);
      const arriving = this.adjustHour(hours[0], -1);
      const leaving = this.adjustHour(hours[1]);
      const a = formatHour(60*arriving);
      const d = formatHour(60*leaving);
      if ((m.year() === this.state.year) && (m.month() === this.state.currentMonth)) {
        res.push({ day: m.format("DD-MM-YYYY"), label1: `${a} (${h1})`, arriving, label2: `${d} (${h2})`, leaving });
      }
    });
    return res;
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
                <Button bsStyle="primary" disabled={!this.state.changed} onClick={this.save}>Enregistrer</Button> 
                <Button bsStyle="primary" onClick={()=>this.editBill(months[this.state.currentMonth])}>Editer facture</Button>
              </ButtonToolbar>
            </Col>
          </FormGroup>
        </Form>
        <p>{' '}</p><p>{' '}</p>
        {Object.keys(this.props.family.children).map((childName, i) => {
            const child = this.props.family.children[childName];
            if (child.present === "0") { return "" }
            const childPeriods = this.childPeriods(childName, year);
            const childHours = this.state.childHours[childName] || {};
            if (childPeriods.length === 0) { return <div>
              <hr></hr>
              <span><h4><Label>{childName}</Label></h4><h4>facturation en heures de présence</h4></span>
              <Table stripped bordered condensed hover>
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
            </div>;
           } else {
            bills[currentMonthName][childName] = bills[currentMonthName][childName] || [{ hours: "", desc: "" }];
            const bill = bills[currentMonthName][childName];
            return child.present === "0" ? "" : <div>
              <hr></hr>
              <span><h4><Label>{childName}</Label></h4><h4>facturation au contrat</h4></span>
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
            </div>} }) }
      </Grid>
    );
  }
}
