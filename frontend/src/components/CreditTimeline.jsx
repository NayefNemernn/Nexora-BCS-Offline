export default function CreditTimeline({history}){

return(

<div className="space-y-4">

{history.map(item => (

<div key={item._id} className="flex gap-4">

<div className={`
w-3 h-3 rounded-full mt-2
${item.type==="payment" ? "bg-green-500":"bg-blue-500"}
`} />

<div>

<p className="font-medium">
{item.type==="payment"
? `Payment - $${item.amount}`
: `Sale - $${item.amount}`
}
</p>

<p className="text-sm text-gray-400">
{new Date(item.date).toLocaleString()}
</p>

</div>

</div>

))}

</div>

)

}