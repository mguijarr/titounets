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
  findDays,
  getFamilyName
} from "./utils";
import "pdfmake";
import "pdfmake-fonts";

export default class Factures extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    let today = moment();
    let last_year = today.add(-1, "years");
    this.state = {
      busy: false,
      openingTime: 0,
      closingTime: 0,
      contractRange: moment.range(last_year, last_year),
      currentMonth: 0, 
      bills: {},
      changed: false
    };

    this.addLine = this.addLine.bind(this);
    this.removeLine = this.removeLine.bind(this);
    this.selectMonth = this.selectMonth.bind(this);
    this.hoursChanged = this.hoursChanged.bind(this);
    this.desChanged = this.descChanged.bind(this);
    this.save = this.save.bind(this);
    this.monthToKey = this.monthToKey.bind(this);
  }

  componentWillMount() {
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

        this.setState({
          contractRange: moment.range(contractStart, contractEnd),
          openingTime: res.opening,
          closingTime: res.closing,
        });
      }),

    fetch("/api/bills/" + this.props.family.id, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(res => {
      this.setState({ bills: res }); 
    })
    ]

    Promise.all(promises).then(() => { this.setState({ busy: false })});
  }

  save() {
    debugger;
    fetch("/api/bills/" + this.props.family.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(this.state.bills)
    }).then(checkStatus);
  }

  monthToKey(m) {
    return m.format('MMMM')+m.year();
  }

  addLine(month) {
    const bills = this.state.bills;
    const m = this.monthToKey(month);
    bills[m].push({ hours: "", desc: "" });
    this.setState({ bills });
  }

  removeLine(month, i) {
    const bills = this.state.bills;
    const m = this.monthToKey(month);
    const bill = bills[m];
    if (bill.length > 1) {
      bill.splice(i, 1);
      this.setState({ bills, changed: true }); 
    }
  }

  selectMonth(i) {
    this.setState({ currentMonth: i });
  }

  hoursChanged(month, i, hours) {
    const bills = this.state.bills;
    const m = this.monthToKey(month);
    bills[m][i].hours = hours;
    this.setState({ bills, changed: true });
  }

  descChanged(month, i, desc) {
    const bills = this.state.bills;
    const m = this.monthToKey(month);
    bills[m][i].desc = desc;
    this.setState({ bills, changed: true });
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src="img/spinner.gif" />;
    }

    const months = [];
    const bills = this.state.bills;
    
    this.state.contractRange.by("month", (mm)=>{ const m = this.monthToKey(mm); months.push(mm); bills[m] = bills[m] || [{ hours: "", desc: "" }] });

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
                <Button bsStyle="primary">Editer facture</Button>
              </ButtonToolbar>
            </Col>
          </FormGroup>
        </Form>
        {bills[this.monthToKey(months[this.state.currentMonth])].map((line, i) =>
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
                      onChange={(e)=>this.hoursChanged(months[this.state.currentMonth], i, e.target.value)}
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
                      onChange={(e)=>this.descChanged(months[this.state.currentMonth], i, e.target.value)}
                    />
                  </Col>
                  <Col sm={2}>
                    <ButtonToolbar className="pull-right">
                      <Button onClick={()=>this.addLine(months[this.state.currentMonth])}><Glyphicon glyph="plus"/></Button>
                      <Button onClick={()=>this.removeLine(months[this.state.currentMonth], i)}><Glyphicon glyph="minus"/></Button>
                    </ButtonToolbar>
                  </Col>
                </FormGroup>
            </Form>
        )}
      </Grid>
    );
  }
}
