export function Sidebar() {
  return (
    <div className="border-red-600 border-2 border-dashed w-[200px] h-screen flex flex-col justify-between">
      <div>
        <div className="border-yellow-600 border-2 border-dashed w-full h-[100px]"></div>
        <div className="border-green-600 border-2 border-dashed w-full h-[200px]"></div>
      </div>
      <div>
        <div className="border-orange-600 border-2 border-dashed w-full h-[60px]"></div>
        <div className="border-gray-600 border-2 border-dashed w-full h-[60px]"></div>
      </div>
    </div>
  )
}
