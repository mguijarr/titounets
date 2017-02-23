import { formatClockTime, isClosed } from "./utils";
import moment from "moment";

export default class Contract {
  constructor(family) {
    this.jours = moment.weekdays(true);
    this.today = moment().format("LL");
   
    this.getContents = this.getContents.bind(this);
    this.calcRate = this.calcRate.bind(this);

    this.family = family;
  }

  calcRate() {
    const monthlyIncome = Number(this.family.qf / 12).toFixed(2);
    const rates = [
      0,
      0.06,
      0.05,
      0.04,
      0.03,
      0.03,
      0.03,
      0.03,
      0.02,
      0.02,
      0.02,
      0.01,
      0.01,
      0.01,
      0.01,
      0.01
    ];
    const nChildren = Object.keys(this.family.children).length;
    const CAF = rates[nChildren];
    let rate = monthlyIncome * CAF / 100.;
    rate = rate.toFixed(3);
    return { CAF, rate };
  }

  getContents(name, address, contractPeriod, closedPeriods, child, childPeriods, rate) {
    const f = this.family;
    const monthlyIncome = Number(this.family.qf / 12).toFixed(2);
    const nChildren = Object.keys(this.family.children).length;
    const cStart = contractPeriod.start.format("L");
    const cEnd = contractPeriod.end.format("L");
    const familyName1 = f.parents[0].split(" ").pop();
    const familyName2 = f.parents[1]
      ? f.parents[1].split(" ").pop()
      : "";
    let familyName = "";
    if (familyName2 === familyName1) {
      familyName = familyName1;
    } else if (familyName2) {
      familyName = familyName1 + " / " + familyName2;
    }
    const birthDate = moment(new Date(child.birthdate)).format("L");
    const periods = [];
    let nHours = 0;
    let nMonths = 0;
    //let nHoursMonth = 0;
    let nDays = 0;
    if (rate === undefined) { rate = this.calcRate();
    } else {
      if (rate.CAF) { rate = this.calcRate(); };
    };
    let monthlyAmount = 0;

    childPeriods = childPeriods.sort((pa, pb) => {
      if (pa.range.start < pb.range.start) {
        return -1;
      } else if (pa.range.start == pb.range.start) {
        return 0;
      } else {
        return 1;
      }
    });

    childPeriods.forEach((p, i) => {
      const sd = moment(p.range.start);
      const ed = moment(p.range.end);
      while (isClosed(sd, closedPeriods)) { sd.add(1,"days"); }      
      while (isClosed(ed, closedPeriods)) { ed.add(-1,"days"); }      
      periods.push([sd.format("L"), ed.format("L"), "", "", ""]);
      
      const days = Object.keys(p.timetable).sort((da,db) => { da < db ? -1 : 1 });

      const r = moment.range(p.range.start, p.range.end);
      r.by("days", d => {
        if (! isClosed(d, closedPeriods)) {
          const hour = p.timetable[d.weekday()+1];
          if (hour) {
            nHours += hour[1] - hour[0];
            nDays += 1;
          }
        }
      });

      days.forEach(d => {
        const hour = p.timetable[d];
        if (hour) {
          periods.push(["","", this.jours[d-1], formatClockTime(hour[0]*3600), formatClockTime(hour[1]*3600)]);
        }
      });
    });

    // find nb of months (over the full presence period)
    /*if (childPeriods.length >= 1) {
      const r = moment.range(
        childPeriods[0].range.start,
        childPeriods[childPeriods.length - 1].range.end
      );
      r.by("months", m => {
        nMonths += 1;
      });

      nHoursMonth = Number(nHours / nMonths).toFixed(2);
    }
    */
    const r = moment.range(contractPeriod.start, contractPeriod.end);
    r.by("months", m => { nMonths += 1 });

    monthlyAmount = rate.rate * (nHours / nMonths);
    monthlyAmount = monthlyAmount.toFixed(2);

    return [
      { columns: [ { text: `${name}`, style: "title", width: "30%" } ] },
      {
        columns: [
          { text: `${address.street[0]}`, style: "centered", width: "30%" }
        ]
      },
      {
        columns: [
          { text: `${address.street[1]}`, style: "centered", width: "30%" }
        ]
      },
      {
        columns: [
          {
            text: `${address.zip} ${address.city}`,
            style: "centered",
            width: "30%"
          }
        ]
      },
      {
        columns: [
          { text: `${address.phone_number}`, style: "centered", width: "30%" }
        ]
      },
      {
        columns: [
          { text: `${address.email}`, style: "centered", width: "30%" }
        ]
      },
      " ",
      " ",
      { text: "CONTRAT D'INSCRIPTION", style: "bigTitle" },
      { text: `du ${cStart} au ${cEnd}`, style: "title" },
      " ",
      " ",
      {
        columns: [
          { text: "Famille:", width: "20%" },
          { text: `${familyName}`, width: "80%" }
        ]
      },
      " ",
      {
        columns: [
          { text: "Adresse:", width: "20%" },
          { text: `${f.address.street[0]}`, width: "80%" }
        ]
      },
      {
        columns: [
          { text: " ", width: "20%" },
          { text: `${f.address.street[1]}`, width: "80%" }
        ]
      },
      {
        columns: [
          { text: " ", width: "20%" },
          { text: `${f.address.zip} ${f.address.city}`, width: "80%" }
        ]
      },
      " ",
      {
        columns: [
          { text: "N\xB0 allocataire:", width: "20%" },
          { text: `${f.id}`, width: "20%" },
          {
            text: `QF: ${f.qf}, revenu mensuel: ${monthlyIncome} euros`,
            width: "60%"
          }
        ]
      },
      " ",
      "Les parents ou repr\xE9sentants l\xE9gaux s'engagent par le pr\xE9sent contrat \xE0 confier la garde de leur enfant:",
      " ",
      { text: `${child.name}`, style: "title" },
      { text: `né(e) le ${birthDate}`, style: "centered" },
      " ",
      "aux heures et jours suivants:",
      " ",
      { columns: [ { width: '*', text: '' },
      {
        width: 'auto',
          table: {
            headerRows: 1,
            style: "lightHorizontalLines",
            body: [ [ "Du", "Au", "Jours", "de", "\xE0" ], ...periods ]
          }
      },{ width: '*', text: '' } ]
      },
      " ",
      {
        columns: [
          { text: "Nb d'heures:", width: "20%" },
          {
            text: `${nHours} pour ${nDays} jours de présence sur ${nMonths} mois`,
            width: "80%"
          }
        ]
      },
      " ",
      {
        columns: [
          { text: "Taux horaire:", width: "20%" },
          {
            text: `${rate.rate}${rate.CAF > 0 ? `, en application du taux CAF ${rate.CAF} (${nChildren} ${nChildren > 1 ? "enfants" : "enfant"} dans la famille)` : ""}`,
            width: "80%"
          }
        ]
      },
      " ",
      { text: `Tarif mensuel: ${monthlyAmount} euros`, style: "title" },
      " ",
      {
        text: `Fait à ${address.city} le ${this.today}. Signature des parents ou du représentant légal:`,
        style: "centered"
      }
    ];
  }
}

