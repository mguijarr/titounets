import { findDays } from './utils';
import moment from 'moment';


export default class Contract {
  constructor() {
    this.jours = moment.weekdays(true);
    this.today = moment().format('LL');
  }

  getContents(name, address, contractPeriod, family, child, childPeriods) {
    const f = family;
    const cStart = contractPeriod.start.format('L');
    const cEnd = contractPeriod.end.format('L');
    const familyName1 = family.parents[0].split(' ').pop();
    const familyName2 = family.parents[1] ? family.parents[1].split(' ').pop() : "";
    let familyName = "";
    if (familyName2 === familyName1) {
      familyName = familyName1; 
    } else if (familyName2) {
      familyName = familyName1 + ' / ' + familyName2;
    }
    const birthDate = moment(new Date(child.birthdate)).format('L');
    const p = []
    let nHours = 0;
    let nMonths = 0;
    let nHoursMonth = 0;
    const monthlyIncome = Number(family.qf / 12).toFixed(2);
    const rates = [0,0.06,0.05,0.04,0.03,0.03,0.03,0.03,0.02,0.02,0.02,0.01,0.01,0.01,0.01,0.01];
    const CAFrate = rates[family.children.length];
    let rate = monthlyIncome*CAFrate/100.;
    let monthlyAmount = 0;

    childPeriods = childPeriods.sort((ra, rb) => { 
      if (ra.start < rb.start) { 
        return -1;
      } else if (ra.start == rb.start) {
        return 0;
      } else {
        return 1;
      }
    });

    childPeriods.forEach((range, i) => {
      const periodDays = findDays([range.start, range.end]);
      const days = [];
      periodDays.forEach((d,i) => { days.push(this.jours[d-1]); });
      p.push([range.start.format('L'), range.end.format('L'), days.join(), range.start.format('LT'), range.end.format('LT')]);

      range.by('days', (d) => {
        if (periodDays.includes(""+(d.weekday()+1))) {
          const sh = range.start.hours()*3600;
          const sm = range.start.minutes()*60;
          const eh = range.end.hours()*3600;
          const em = range.end.minutes()*60;
          const duration = (eh+em)-(sh+sm);
          const dh = Math.floor(duration / 3600);
          const dm = Math.floor((duration - dh*3600) / 60);      
          nHours += dh + dm;
        }
      });     
    });

    if (childPeriods.length >= 1) {
      const r = moment.range(childPeriods[0].start, childPeriods[childPeriods.length-1].end);
      r.by('months', (m) => { nMonths += 1 });
      nHoursMonth = Number(nHours/nMonths).toFixed(2);
    }

    monthlyAmount = rate*(nHours/nMonths);
    monthlyAmount = monthlyAmount.toFixed(2);
    rate = rate.toFixed(3);

    return [
{ columns: [{ text: `${name}`, style: 'title', width:'30%' }]},
{ columns: [{ text: `${address.street[0]}`, style: 'centered', width: '30%' }]},
{ columns: [{ text: `${address.street[1]}`, style: 'centered', width: '30%' }]},
{ columns: [{ text: `${address.zip} ${address.city}`, style: 'centered', width: '30%' }]},
{ columns: [{ text: `${address.phone_number}`, style: 'centered', width: '30%' }]},
{ columns: [{ text: `${address.email}`, style: 'centered', width: '30%' }]},
' ', ' ', 
{  text: "CONTRAT D'INSCRIPTION", style: 'bigTitle' },
{  text: `du ${cStart} au ${cEnd}`, style: 'title' },
' ', ' ',
{  columns: [{  text: 'Famille:', width: '20%' },  {  text: `${familyName}`, width: '80%' }] },
' ',
{  columns: [{  text: 'Adresse:', width: '20%' }, {  text: `${f.address.street[0]}`, width: '80%' } ]},
{  columns: [{  text: ' ', width: '20%' }, {  text: `${f.address.street[1]}`, width: '80%' }] },
{  columns: [{  text: ' ', width: '20%' }, {  text: `${f.address.zip} ${f.address.city}`, width: '80%' }] },
' ',
{  columns: [{  text: 'N° allocataire:', width: '20%' },{  text: `${f.id}`, width: '20%' }, {  text: `QF: ${family.qf}, revenu mensuel: ${monthlyIncome} euros`, width: '60%' }] },
" ",
"Les parents ou représentants légaux s'engagent par le présent contrat à confier la garde de leur enfant:",
" ",
{ text: `${child.name}`, style: 'title' },
{ text: `né(e) le ${birthDate}`, style: 'centered' },
" ",
"aux heures et jours suivants:",
" ",
{ table: {
    style: 'lightHorizontalLines',
    body: [
      ['Du', 'Au', 'Jours', 'de', 'à'],
      ...p
    ]
  }
},
{ text: ' ', pageBreak: p.length > 13 ? 'after' : null },
{ columns: [{  text: "Nb d'heures:", width: '20%' }, { text: `${nHours} pour ${nMonths} mois de présence, soit ${nHoursMonth} heures mensuelles en moyenne`, width: '80%' }]},
' ',
{ columns: [{  text: 'Taux horaire:', width: '20%' },  {  text: `${rate}, en application du taux CAF ${CAFrate} (${family.children.length} enfants dans la famille)`, width: '80%' }] },
' ',
{ text: `Tarif mensuel: ${monthlyAmount} euros`, style: 'title' },
' ',
{ text: `Fait à ${address.city} le ${this.today}. Signature des parents ou du représentant légal:`, style: 'centered', pageBreak: 'after' }
]};
}

