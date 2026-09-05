import type { InputType } from './InputType'

function Input({ label, placeholder, value, onChange }: InputType) {
    return (
        <div className="flex flex-col gap-y-1 w-full">
            <p className="text-[14px] text-[#3C4A42]">{label}</p>
            <input type="text" placeholder={placeholder} value={value} onChange={onChange} className="w-full py-3.5 px-3 text-[16px] border border-[#BBCABF] rounded-lg bg-[#F8F9FB]" />
        </div>
    )
}

export { Input }
