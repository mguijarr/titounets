import { formatClockTime, isClosed } from "./utils";
import moment from "moment";

export default class Contract {
  constructor(family) {
    this.jours = moment.weekdays(true);
    this.today = moment().format("LL");
  
    this.getContents = this.getContents.bind(this);
    this.calcRate = this.calcRate.bind(this);
    this.getBill = this.getBill.bind(this);
    this.calcBill = this.calcBill.bind(this);
    this.getFamilyName = this.getFamilyName.bind(this);
    this.getPeriodsMonthsDaysHours = this.getPeriodsMonthsDaysHours.bind(this);
    this.getHoursBill = this.getHoursBill.bind(this);

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
    rate = rate.toFixed(2);
    return { CAF, rate };
  }

  getPeriodsMonthsDaysHours(childPeriods, closedPeriods, contractPeriod) {
     const periods = [];
     let nDays = 0;
     let nHours = 0;

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
       for (const d of r.by("day")) {
         if (! isClosed(d, closedPeriods)) {
           const hour = p.timetable[d.weekday()+1];
           if (hour) {
             nHours += hour[1] - hour[0];
             nDays += 1;
           }
         }
       }

       days.forEach(d => {
         const hour = p.timetable[d];
         if (hour) {
           periods.push(["","", this.jours[d-1], formatClockTime(hour[0]*3600), formatClockTime(hour[1]*3600)]);
         }
       });
    });

    const r = moment.range(contractPeriod.start, contractPeriod.end);
    const nMonths = Array.from(r.by("month")).length;

    return { periods, nMonths, nDays, nHours };
  }

  calcBill(hRate, data, nHours) {
    const rate = parseFloat(hRate);

    if (nHours != undefined) {
      const SHours = [];
      const DHours = [];
      const monthlyAmount = (rate * nHours).toFixed(2);
      let nSHours = 0;
      let nDHours = 0;

      data.map(d => {
        const n = parseFloat(d.hours);
        if (! isNaN(n)) {
          if (n<0) {
            nDHours -= n;
            DHours.push([d.desc, (-n).toString(), rate.toString(), (n*rate).toFixed(2).toString()]);
          } else {
            nSHours += n;
            SHours.push([d.desc, n.toString(), rate.toString(), (n*rate).toFixed(2).toString()]);
          }
        }
      });

      return { amount: (parseFloat(monthlyAmount)+rate*(nSHours - nDHours)).toFixed(2),
               monthlyAmount,
               SHours,
               DHours }
    } else {
      const hoursTable = [];
      let amount = 0;

      data.forEach((h,i) => {
        const a = parseFloat(h.arriving);
        const b = parseFloat(h.leaving);
        const dayAmount = rate*(b-a);
        amount += dayAmount;
        hoursTable.push([h.day, h.label1, h.label2, (b-a).toString(), rate.toString(), dayAmount.toFixed(2).toString()]);
      });

      amount = amount.toFixed(2);

      return { amount, hoursTable };
    }
  }

  getHoursBill(name, address, monthName, year, childName, hours, rate, billAmount) {
    const familyName = this.getFamilyName();
    const { amount, hoursTable } = this.calcBill(rate, hours);
    billAmount[childName] = amount;
    hoursTable.push(["", "", "", "", { text: "Total dû", bold: true }, { text: amount.toString(), bold: true }]);

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
      { text: "FACTURE", style: "bigTitle" },
      { text: `du mois de ${monthName} ${year}`, style: "title" },
      " ",
      " ",
      {
        columns: [
          { text: "Famille:", width: "20%" },
          { text: `${familyName}`, width: "80%" }
        ]
      },
      { columns: [
          { text: "Prénom de l'enfant:", width: "20%" },
          { text: `${childName}`, width: "80%" }
        ]
      },
      " ",
      " ",
      { columns: [ { width: '*', text: '' },
      {
        width: 'auto',
          table: {
            headerRows: 1,
            style: "lightHorizontalLines",
            body: [ [ "Jour", "Arrivée", "Départ", "Heures", "Taux horaire", "Total" ],  ...hoursTable ]
          }
      }, { width: '*', text: '' } ] }
    ]
  }

  getBill(name, address, monthName, year, childName, nHours, rate, data, billAmount) {
    const familyName = this.getFamilyName();
    const { amount, monthlyAmount, SHours, DHours } = this.calcBill(rate, data, nHours);
    billAmount[childName] = amount;

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
      { text: "FACTURE", style: "bigTitle" },
      { text: `du mois de ${monthName} ${year}`, style: "title" },
      " ",
      " ",
      {
        columns: [
          { text: "Famille:", width: "20%" },
          { text: `${familyName}`, width: "80%" }
        ]
      },
      { columns: [
          { text: "Prénom de l'enfant:", width: "20%" },
          { text: `${childName}`, width: "80%" }
        ]
      },
      " ",
      " ",
      { columns: [ { width: '*', text: '' },
      {
        width: 'auto',
          table: {
            headerRows: 1,
            style: "lightHorizontalLines",
            body: [ [ "Libellé", "Heures", "Taux horaire", "Total" ], ["Contrat", nHours, rate, monthlyAmount],
                    ["", "", "", ""], [{ text: "Heures venant en déduction", italics: true }, "", "", ""],  ...DHours,
                    ["", "", "", ""], [{ text: "Heures supplémentaires au contrat", italics: true }, "", "", ""], ...SHours,
                    ["", "", "", ""], ["", "", { text: "Total dû", bold: true }, { text: amount.toString(), bold: true }]
                  ]
          }
      }, { width: '*', text: '' } ]
      }
    ]
  }

  getFamilyName() {
    const f = this.family;
    const familyName1 = f.parents[0].split(" ").pop();
    const familyName2 = f.parents[1]
      ? f.parents[1].split(" ").pop()
      : "";
    let familyName = "";
    if (familyName2 === familyName1) {
      familyName = familyName1;
    } else if (familyName2) {
      familyName = familyName1 + " / " + familyName2;
    } else {
      familyName = familyName1;
    }
    return familyName;
  }

  getContents(name, address, contractPeriod, closedPeriods, child, childPeriods, rate) {
    const f = this.family;
    const monthlyIncome = Number(this.family.qf / 12).toFixed(2);
    const nChildren = Object.keys(this.family.children).length;
    const cStart = contractPeriod.start.format("L");
    const cEnd = contractPeriod.end.format("L");
    const familyName = this.getFamilyName();
    const birthDate = moment(new Date(child.birthdate)).format("L");
    if (rate === undefined) {
      rate = this.calcRate();
    } else {
      if (rate.CAF) { rate = this.calcRate(); };
    };

    const { periods, nMonths, nDays, nHours } = this.getPeriodsMonthsDaysHours(childPeriods, closedPeriods, contractPeriod);
    const monthlyAmount = (rate.rate * (nHours / nMonths)).toFixed(2);

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
            text: `Revenu mensuel: ${monthlyIncome} euros`,
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
            text: `${rate.rate}${rate.CAF > 0 ? `, en application du barème CNAF ${rate.CAF} (${nChildren} ${nChildren > 1 ? "enfants" : "enfant"} dans la famille)` : ""}`,
            width: "80%"
          }
        ]
      },
      " ",
      { text: `Tarif mensuel: ${monthlyAmount} euros`, style: "title" },
      " ", " ",
      {
        text: 'Ce contrat sera révisé avec la famille:' }, " ",
      { text: '- en début de chaque année civile' },
      { text: "- lors d'une naissance dans la famille" },
      { text: "- ou bien si les horaires demandés ne conviennent plus pour des raisons professionnelles." }, " ",
      { text: "La direction se réserve le droit de réviser le contrat unilatéralement si les heures demandées sont systématiquement dépassées ; en outre, chaque demi-heure commencée est comptabilisée. Les heures réalisées au-delà du contrat prévu sont arrondies à la demi-heure 'cadran'." },
      " ", " ",
      {
        text: `Fait à ${address.city} le ${this.today}.`,
        style: "centered"
      },
      " ",
      {
       columns: [
         { text: "Signature des parents ou du représentant légal:", width: "70%" },
         { text: "Signature de l'établissement:", width: "30%" }
       ]
      }
    ];
  }
}

