import type { InputType } from './InputType'

function Input({ label, error, ...inputProps }: InputType) {
  return (
    <div className="flex flex-col gap-y-1 w-full">
      {label && <p className="text-[14px] text-[#3C4A42]">{label}</p>}
      <input
        type="text"
        {...inputProps}
        className="w-full py-3.5 px-3 text-[16px] placeholder:text-[#6B7280] border border-[#BBCABF] rounded-lg bg-[#F8F9FB]"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

export { Input }
