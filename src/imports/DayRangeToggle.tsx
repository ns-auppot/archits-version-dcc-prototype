import clsx from "clsx";
type ButtonTextProps = {
  text: string;
  additionalClassNames?: string;
};

function ButtonText({ text, additionalClassNames = "" }: ButtonTextProps) {
  return (
    <div className={clsx("h-[24.5px] relative rounded-[4px]", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[16.5px] left-[18.5px] not-italic text-[#64748b] text-[11px] text-center top-[4.5px] whitespace-nowrap">{text}</p>
      </div>
    </div>
  );
}

export default function DayRangeToggle() {
  return (
    <div className="bg-[#f1f5f9] content-stretch flex gap-[2px] items-center px-[3px] py-px relative rounded-[6px] size-full" data-name="DayRangeToggle">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="bg-[rgba(148,163,184,0.12)] h-[24.5px] relative rounded-[4px] shrink-0 w-[36.805px]" data-name="Button">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
          <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[16.5px] left-[18px] not-italic text-[#0f172a] text-[11px] text-center top-[4.5px] whitespace-nowrap">30d</p>
        </div>
      </div>
      <ButtonText text="60d" additionalClassNames="shrink-0 w-[36.836px]" />
      <ButtonText text="90d" additionalClassNames="flex-[1_0_0] min-h-px min-w-px" />
    </div>
  );
}