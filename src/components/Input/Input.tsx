import type { InputType } from './InputType'

function Input({ placeholder }: InputType) {
    return (
        <>
            <input type="text" placeholder={placeholder} className="w-[584px] py-3.5 px-3 border border-[#BBCABF] rounded-lg bg-[#F8F9FB]" />
        </>
    )
}

export { Input }
