import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex justify-center items-center flex-1 py-12">
      <SignUp />
    </div>
  )
}