let families = [];
let family = {};

let data = { families, family, addFamily: (f) => { 
  families.push(f);
  family[f.id] = f;
}};

export default data;
