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
      start: null,
      end: null,
      children: [],
      openingHours: []
    };

    this.trimesterChanged = this.trimesterChanged.bind(this);
    this.print = this.print.bind(this);
  }

  print() {
  }

  trimesterChanged(i) {
    this.setState({ trimester: i });

    if (i == 0) {
        this.setState({ start: moment("01-01-2017", "DD-MM-YYYY"), end: moment("01-03-2017", "DD-MM-YYYY") });
    } else if (i == 1) {
        this.setState({ start: moment("01-04-2017", "DD-MM-YYYY"), end: moment("01-06-2017", "DD-MM-YYYY") });
    } else if (i == 2) {
        this.setState({ start: moment("01-07-2017", "DD-MM-YYYY"), end: moment("01-09-2017", "DD-MM-YYYY") });
    } else if (i == 3) {
        this.setState({ start: moment("01-10-2017", "DD-MM-YYYY"), end: moment("01-12-2017", "DD-MM-YYYY") });
    } 
  }

  componentDidMount() {
    this.setState({busy: true});
    
    const promises = [fetch("/api/childrenHoursPeriods", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(res => {
      const tmp = {}
      for (const username in res) {
        for (const childName in res[username]) {
          const child = res[username][childName];
          child.periods.forEach(p => {
              p.range = moment.range(p.range.start, p.range.end);
          });
          tmp[child.data.surname + " " + child.data.name] = child;
        }
      }
      const children = Object.keys(tmp).sort().map(k=>tmp[k]);
      this.setState({ children });
    }),
    // get opening hours
    fetch("/api/parameters", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        this.setState({ openingHours: [res.opening, res.closing] });
      })
    ]
  
    Promise.all(promises).then(() => { this.setState({busy: false}); this.trimesterChanged(0); });
  }

  render() {
    if (this.state.busy) {
      return <img className="centered" src={spinner} />;
    }

    const months = [];
    for (var hours=[]; hours.push([null,null,null,null,null,null])<this.state.children.length;);
    for (var bill=[]; bill.push([null,null,null])<this.state.children.length;);
    let j = 0;
    for (const m of moment.range(moment(this.state.start), moment(this.state.end)).by("month")) {
        months.push(m.format("MMMM YYYY"));
        this.state.children.forEach((c,i) => {
          const tmp = {};
          if (c.data.surname ==="COLIN") { debugger;}
          getHours(c.hours, c.periods, m.month(), 2017, this.state.openingHours[0], this.state.openingHours[1], tmp);
          hours[i][j]=tmp.done.toFixed(2);
          hours[i][j+1]=tmp.paid.toFixed(2);
        });
        j+=2;
    }

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
           <h5><b>Enfant</b></h5>
          </Col>
          { months.map(m=><Col sm={3}><center><h5><b>{m}</b></h5></center></Col>) }
        </Row>
        <Row>
           <Col sm={1} smOffset={3}><h5><b>H. realisees</b></h5></Col>  
           <Col sm={1}><h5><b>H. facturees</b></h5></Col>  
           <Col sm={1}><h5><b>Montant facture</b></h5></Col>  
           <Col sm={1}><h5><b>H. realisees</b></h5></Col>  
           <Col sm={1}><h5><b>H. facturees</b></h5></Col>  
           <Col sm={1}><h5><b>Montant facture</b></h5></Col>  
           <Col sm={1}><h5><b>H. realisees</b></h5></Col>  
           <Col sm={1}><h5><b>H. facturees</b></h5></Col>  
           <Col sm={1}><h5><b>Montant facture</b></h5></Col>  
        </Row>
        { this.state.children.map((c, i) => { return <Row>
          <Col sm={3}><h5>{c.data.surname + ' ' + c.data.name}</h5></Col>
          <Col sm={1}><h5>{hours[i][0]}</h5></Col>
          <Col sm={1}><h5>{hours[i][1]}</h5></Col>
          <Col sm={1}><h5>{bill[i][0]}</h5></Col>
          <Col sm={1}><h5>{hours[i][2]}</h5></Col>
          <Col sm={1}><h5>{hours[i][3]}</h5></Col>
          <Col sm={1}><h5>{bill[i][1]}</h5></Col>
          <Col sm={1}><h5>{hours[i][4]}</h5></Col>
          <Col sm={1}><h5>{hours[i][5]}</h5></Col>
          <Col sm={1}><h5>{bill[i][2]}</h5></Col>
        </Row> } ) } 
      </Grid>
    );
  }
}
