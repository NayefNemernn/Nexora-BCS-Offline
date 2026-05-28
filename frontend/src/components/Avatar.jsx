export default function Avatar({ name }) {

  const letter = name?.charAt(0).toUpperCase();

  return (

    <div className="w-8 h-8 rounded-full bg-purple-300 flex items-center justify-center font-semibold">

      {letter}

    </div>

  );
}