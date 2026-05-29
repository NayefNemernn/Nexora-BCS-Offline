import {BarChart,Bar,XAxis,YAxis,Tooltip} from "recharts";
import {useEffect,useState} from "react";
import api from "../api/axios";

export default function PaymentsChart(){

const [data,setData] = useState([]);

useEffect(()=>{

load();

},[]);

const load = async ()=>{

const res = await api.get("/hold-sales/payments/month");

const map={};

res.data.forEach(p=>{

const day = new Date(p.createdAt).getDate();

map[day] = (map[day]||0)+p.amount;

});

const arr = Object.keys(map).map(d=>({
day:d,
amount:map[d]
}));

setData(arr);

};

return(

<BarChart width={300} height={200} data={data}>

<XAxis dataKey="day"/>

<YAxis/>

<Tooltip/>

<Bar dataKey="amount"/>

</BarChart>

);
}