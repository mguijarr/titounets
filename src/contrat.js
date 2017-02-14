import { formatClockTime, isClosed } from "./utils";
import moment from "moment";

export default class Contract {
  constructor() {
    this.jours = moment.weekdays(true);
    this.today = moment().format("LL");
  }

  getContents(name, address, contractPeriod, closedPeriods, family, child, childPeriods) {
    const f = family;
    const cStart = contractPeriod.start.format("L");
    const cEnd = contractPeriod.end.format("L");
    const familyName1 = family.parents[0].split(" ").pop();
    const familyName2 = family.parents[1]
      ? family.parents[1].split(" ").pop()
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
    const monthlyIncome = Number(family.qf / 12).toFixed(2);
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
    const n = Object.keys(family.children).length;
    const CAFrate = rates[n];
    let rate = monthlyIncome * CAFrate / 100.;
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

    monthlyAmount = rate * (nHours / nMonths);
    monthlyAmount = monthlyAmount.toFixed(2);
    rate = rate.toFixed(3);

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
            text: `QF: ${family.qf}, revenu mensuel: ${monthlyIncome} euros`,
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
      {
        table: {
          style: "lightHorizontalLines",
          body: [ [ "Du", "Au", "Jours", "de", "\xE0" ], ...periods ]
        }
      },
      { text: " ", pageBreak: periods.length > 13 ? "after" : null },
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
            text: `${rate}, en application du taux CAF ${CAFrate} (${n} ${n > 1 ? "enfants" : "enfant"} dans la famille)`,
            width: "80%"
          }
        ]
      },
      " ",
      { text: `Tarif mensuel: ${monthlyAmount} euros`, style: "title" },
      " ",
      {
        text: `Fait à ${address.city} le ${this.today}. Signature des parents ou du représentant légal:`,
        style: "centered",
        pageBreak: "after"
      }
    ];
  }
}

