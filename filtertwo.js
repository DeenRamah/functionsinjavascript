let people=[
  {age:27, gender: "male"},
  {age: 17, gender: "female"},
  {age:87, gender: "male"},
  {age:3, gender: "female"},
  {age:65, gender: "male"},
];

//finding people who are male
let malepeople = people.filter((item) =>{
  return item.gender === "male";
});

console.log(malepeople);
