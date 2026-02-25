import { Button } from "@/components/ui/button"
import {Link} from "react-router-dom"

export default function NotFoundPage(){
    return(
        <div>
        <h1>Page Not Found</h1>
        <p>The page you are looking for doesn't exist.</p>
        <Link to={"/home"}>
            <Button>Go back home.</Button>
        </Link>
        </div>
    )
}