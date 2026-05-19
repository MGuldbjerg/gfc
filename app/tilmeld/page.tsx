import { redirect } from 'next/navigation'

// Old /tilmeld URL kept as a redirect for backward compatibility.
// The new entry point for both signup and login is /log-ind.
export default function TilmeldRedirect() {
  redirect('/log-ind')
}
