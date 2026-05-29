import clsx from "clsx";
type TextTextProps = {
  text: string;
  additionalClassNames?: string;
};

function TextText({ text, additionalClassNames = "" }: TextTextProps) {
  return (
    <div className={clsx("absolute bg-[#f1f5f9] content-stretch flex h-[22.5px] items-start px-[7px] py-[3px] rounded-[4px]", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[16.5px] not-italic relative shrink-0 text-[#1e293b] text-[11px] text-center whitespace-nowrap">{text}</p>
    </div>
  );
}

export default function Ro() {
  return (
    <div className="relative size-full" data-name="Ro">
      <TextText text="Email Addresses" additionalClassNames="left-0 top-0 w-[99.719px]" />
      <TextText text="Personal Names" additionalClassNames="left-[103.72px] top-0 w-[98.281px]" />
      <TextText text="Company Names" additionalClassNames="left-0 top-[26.5px] w-[102.672px]" />
    </div>
  );
}