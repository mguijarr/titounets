import React from "react";
import ReactDOM from "react-dom";
import Moment from "moment";
import { extendMoment } from "moment-range";
import {
  Grid,
  Row,
  Col,
  Form,
  FormGroup,
  FormControl,
  ControlLabel,
  Button,
  Label,
  Glyphicon,
  Panel,
  PanelGroup,
  Modal,
  Checkbox,
  DropdownButton,
  MenuItem,
  Table
} from "react-bootstrap";
import ChildData from "./child.js";
import auth from "./auth";
import { checkStatus, parseJSON, formatHour, getHours } from "./utils";
import spinner from "./img/spinner.gif";

const moment = extendMoment(Moment);

export default class CAF extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.trimesters = [ "janvier - fevrier - mars",
      "avril - mai - juin",
      "juillet - aout - septembre",
      "octobre - novembre - decembre" ]

    this.state = {
      busy: false,
      trimester: 0,
      year: 2017,
      start: null,
      end: null,
      data: [],
    };

    this.trimesterChanged = this.trimesterChanged.bind(this);
    this.print = this.print.bind(this);
  }

  print() {
  }

  trimesterChanged(i) {
    this.setState({ trimester: i });

    if (i == 0) {
        this.setState({ start: moment("01-01-"+this.state.year, "DD-MM-YYYY"), end: moment("01-03-"+this.state.year, "DD-MM-YYYY") });
    } else if (i == 1) {
        this.setState({ start: moment("01-04-"+this.state.year, "DD-MM-YYYY"), end: moment("01-06-"+this.state.year, "DD-MM-YYYY") });
    } else if (i == 2) {
        this.setState({ start: moment("01-07-"+this.state.year, "DD-MM-YYYY"), end: moment("01-09-"+this.state.year, "DD-MM-YYYY") });
    } else if (i == 3) {
        this.setState({ start: moment("01-10-"+this.state.year, "DD-MM-YYYY"), end: moment("01-12-"+this.state.year, "DD-MM-YYYY") });
    } 
  }

  componentDidMount() {
    this.setState({busy: true});
    
    const promises = [fetch("/api/bills/archive/"+this.state.year, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(res => {
      const data = {}
      for (const username in res) {
        for (const m in res[username]) {
          if (data[m] === undefined) { data[m] = {}; }
          for (const childName in res[username][m]) {
            if (childName === '__bill__') { continue; }
            const child = res[username][m][childName];
            const k = child.data.surname + " " + child.data.name;
            data[m][k] = { hoursDone: child.hoursDone, hoursCharged: child.hoursCharged, amount: child.amount };
          }
        }
      }
      this.setState({ data });
    })];
  
    Promise.all(promises).then(() => { this.setState({busy: false}); this.trimesterChanged(0); });
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src={spinner} />;
    }

    const months = [];
    const total = [ [0,0,0], [0,0,0], [0,0,0] ];
    const tmp = {};
    let i = 0;
    let j = 0;

    for (const m of moment.range(moment(this.state.start), moment(this.state.end)).by("month")) {
        months.push(m.format("MMMM YYYY"));
        const childrenData = this.state.data[m.month()];
        if (childrenData != undefined) {
          Object.keys(childrenData).forEach(childName => {
            const data = childrenData[childName];
            if (tmp[childName] === undefined) {
              tmp[childName] = { hours: [0, 0, 0, 0, 0, 0], bill: [0, 0, 0] }
            }
            total[i][0] += Number(data.hoursDone);
            total[i][1] += Number(data.hoursCharged);
            total[i][2] += Number(data.amount);
            tmp[childName].hours[j] = data.hoursDone;
            tmp[childName].hours[j+1] = data.hoursCharged;
            tmp[childName].bill[i] = data.amount;
        }); }
        i+=1;
        j+=2;
    }

   const children = Object.keys(tmp).sort().reduce((r, k) => (r[k] = tmp[k], r), {});

   return (
      <Grid>
        <Row>
          <Col sm={12} lgOffset={2}>
            <Form horizontal>
              <FormGroup>
                <Col sm={2} componentClass={ControlLabel}>Trimestre</Col>
                <Col sm={4}>
                  <FormControl componentClass="select" placeholder="select"
                   onChange = {(e) => { this.trimesterChanged(parseInt(e.target.value, 10)); }}
                   value={this.state.trimester}>
                    { this.trimesters.map((label,i) => <option value={i}>{label}</option>) }
                  </FormControl>
                </Col>
                <Col sm={1} smOffset={1}>
                  <Button bsStyle="primary" block onClick={this.print}>Imprimer</Button>
                </Col>
              </FormGroup>
            </Form>
          </Col>
        </Row>
        <Row>
          <Col sm={3}>
            <p>&nbsp;</p>
          </Col>
          { months.map(m=><Col sm={3}><center><h5><b>{m}</b></h5></center></Col>) }
        </Row>
        <Row>
           <Col sm={3}>
             <h5><b>Enfant</b></h5>
           </Col>
           <Col sm={1}><h5><b>H. realisees</b></h5></Col>  
           <Col sm={1}><h5><b>H. facturees</b></h5></Col>  
           <Col sm={1}><h5><b>Montant facture</b></h5></Col>  
           <Col sm={1}><h5><b>H. realisees</b></h5></Col>  
           <Col sm={1}><h5><b>H. facturees</b></h5></Col>  
           <Col sm={1}><h5><b>Montant facture</b></h5></Col>  
           <Col sm={1}><h5><b>H. realisees</b></h5></Col>  
           <Col sm={1}><h5><b>H. facturees</b></h5></Col>  
           <Col sm={1}><h5><b>Montant facture</b></h5></Col>  
        </Row>
        { Object.keys(children).map(childName=>{
            const childData=children[childName];
            return <Row>
              <Col sm={3}><h5>{childName}</h5></Col>
              <Col sm={1}><h5>{childData.hours[0]}</h5></Col>
              <Col sm={1}><h5>{childData.hours[1]}</h5></Col>
              <Col sm={1}><h5>{childData.bill[0]}</h5></Col>
              <Col sm={1}><h5>{childData.hours[2]}</h5></Col>
              <Col sm={1}><h5>{childData.hours[3]}</h5></Col>
              <Col sm={1}><h5>{childData.bill[1]}</h5></Col>
              <Col sm={1}><h5>{childData.hours[4]}</h5></Col>
              <Col sm={1}><h5>{childData.hours[5]}</h5></Col>
              <Col sm={1}><h5>{childData.bill[2]}</h5></Col>
        </Row> } ) } 
        <Row>
          <Col sm={3}><h5><b>Total</b></h5></Col>
          <Col sm={1}><h5><b>{total[0][0].toFixed(2)}</b></h5></Col>
          <Col sm={1}><h5><b>{total[0][1].toFixed(2)}</b></h5></Col>
          <Col sm={1}><h5><b>{total[0][2].toFixed(2)}</b></h5></Col>
          <Col sm={1}><h5><b>{total[1][0].toFixed(2)}</b></h5></Col>
          <Col sm={1}><h5><b>{total[1][1].toFixed(2)}</b></h5></Col>
          <Col sm={1}><h5><b>{total[1][2].toFixed(2)}</b></h5></Col>
          <Col sm={1}><h5><b>{total[2][0].toFixed(2)}</b></h5></Col>
          <Col sm={1}><h5><b>{total[2][1].toFixed(2)}</b></h5></Col>
          <Col sm={1}><h5><b>{total[2][2].toFixed(2)}</b></h5></Col>
        </Row>
      </Grid>
    );
  }
}
