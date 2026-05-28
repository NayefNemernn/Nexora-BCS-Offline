import { useTheme } from "../context/ThemeContext";
import { FaMoon, FaSun } from "react-icons/fa";

export default function ThemeToggle(){

const { theme, toggleTheme } = useTheme();

return (

<button onClick={toggleTheme}>
  {theme === "dark" ? <FaSun/> : <FaMoon/>}
</button>

);

}