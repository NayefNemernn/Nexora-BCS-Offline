import { useEffect, useState } from "react";
import api from "../api/axios";

export default function CustomerInvoices({customer}){

const [invoices,setInvoices] = useState([]);

useEffect(()=>{

load();

},[]);

const load = async()=>{

const res = await api.get(`/hold-sales/invoices/${customer}`);

setInvoices(res.data);

};

return(

<div className="space-y-3">

{invoices.map(inv=>(
<div key={inv._id} className="border p-3 rounded">

<p className="font-semibold">
Invoice
</p>

{inv.items.map((i,idx)=>(
<p key={idx}>
{i.name} x{i.quantity}
</p>
))}

</div>
))}

</div>

);

}