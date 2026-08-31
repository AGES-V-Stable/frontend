import { Input } from "@/components/Input"

function Register() {
  return <>
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Input placeholder="Email" />
      <Input placeholder="Password" />
    </div>
  </>
}

export { Register }
