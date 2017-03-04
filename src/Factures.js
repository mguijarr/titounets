import React from "react";
import moment from "moment";
import "moment-range";
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
  findDays
} from "./utils";
import "pdfmake";
import "pdfmake-fonts";
import Contract from "./contrat";

export default class Factures extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    let today = moment();
    let last_year = today.add(-1, "years");
    this.state = {
      busy: true,
      contractRange: moment.range(last_year, last_year),
      currentMonth: 0, 
      bills: {},
      parameters: {},
      changed: false
    };

    this.addLine = this.addLine.bind(this);
    this.removeLine = this.removeLine.bind(this);
    this.selectMonth = this.selectMonth.bind(this);
    this.hoursChanged = this.hoursChanged.bind(this);
    this.desChanged = this.descChanged.bind(this);
    this.save = this.save.bind(this);
    this.getData = this.getData.bind(this);
    this.editBill = this.editBill.bind(this);
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

    fetch("/api/bills/" + familyId, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(res => {
      const parameters = res.parameters;
      const contractStart = moment(new Date(parameters.contractStart));
      const contractEnd = moment(new Date(parameters.contractEnd));
      const contractRange = moment.range(contractStart, contractEnd);
      const year = contractStart.year();
      parameters.closedPeriods = res.parameters.closedPeriods.map(p => {
        return moment.range(p);
      });
      const bills = res.bills[year] || {};
      res.bills[year] = bills;
      this.setState({ parameters, currentMonth: 0, changed: false, bills: res.bills, year, contractRange, busy: false }); 
    });
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

  editBill(month) {
    const bill = new Contract(this.props.family);
    const monthName = month.format("MMMM");
    const params = this.state.parameters;
    const address = params.address;
    address.phone_number = params.phone_number;
    address.email = params.email;
    
    fetch("/api/periods/" + this.props.family.id, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(res => {
      const rate = { CAF: res.rate.CAF, rate: res.rate.CAF ? bill.calcRate().rate : res.rate.rate };
      // periods in the form: { childName: [ { range: xxx, timetable: { "2": [hStart, hEnd], ... } }, ...], ... }
      Object.keys(this.props.family.children).map(childName => {
        const child = this.props.family.children[childName];
        const childPeriods = [];
        if (child.present === '1') {
          Object.keys(res.periods).forEach(pChildName => {
            if (pChildName === childName) {
              res.periods[childName].forEach(p => {
                p.range = moment.range(p.range.start, p.range.end);
                if (p.range.end.year() === month.year()) {
                  childPeriods.push(p);
                }
              });
            }
          });

          const { periods, nMonths, nDays, nHours } = bill.getPeriodsMonthsDaysHours(childPeriods, this.state.parameters.closedPeriods, this.state.contractRange);
          const monthlyAmount = (rate.rate * (nHours / nMonths)).toFixed(2);
          debugger;
          const content = bill.getBill(params.name, address, monthName, childName, nHours, rate, this.state.bills[month.year()][monthName][childName]);

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
          };

          pdfMake.createPdf(docDefinition).open();
        }
      }); 
    });
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src="img/spinner.gif" />;
    }

    const months = [];
    const year = this.state.year;
    const bills = this.state.bills[year];

    this.state.contractRange.by("month", (mm)=>{ 
      const m = mm.format('MMMM');
      months.push(mm);
      bills[m] = bills[m] || {};
    });

    return (
      <Grid>
        <p></p>
        <Form horizontal>
          <FormGroup>
            <Col sm={1} componentClass={ControlLabel}>
              Mois de 
            </Col>
            <Col sm={2}>
              <DropdownButton title={months[this.state.currentMonth].format('MMMM')}>
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
            bills[months[this.state.currentMonth].format("MMMM")][childName] = bills[months[this.state.currentMonth].format("MMMM")][childName] || [{ hours: "", desc: "" }];
            const bill = bills[months[this.state.currentMonth].format("MMMM")][childName];
            return child.present === "0" ? "" : <div>
              <hr></hr>
              <h4><Label>{childName}</Label></h4>
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
            </div> }) }
      </Grid>
    );
  }
}
