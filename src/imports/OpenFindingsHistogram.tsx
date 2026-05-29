import clsx from "clsx";
import svgPaths from "./svg-8cvnrr1495";
type WrapperProps = {
  additionalClassNames?: string;
};

function Wrapper({ children, additionalClassNames = "" }: React.PropsWithChildren<WrapperProps>) {
  return (
    <div className={clsx("h-[22px] relative rounded-[4px]", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">{children}</div>
    </div>
  );
}
type TextTextProps = {
  text: string;
  additionalClassNames?: string;
};

function TextText({ text, additionalClassNames = "" }: TextTextProps) {
  return (
    <div className={clsx("absolute h-[9px]", additionalClassNames)}>
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[9px] left-0 not-italic text-[#64748b] text-[9px] top-0 whitespace-nowrap">{text}</p>
    </div>
  );
}
type ButtonTextProps = {
  text: string;
};

function ButtonText({ text }: ButtonTextProps) {
  return (
    <Wrapper additionalClassNames="shrink-0 w-[34px]">
      <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[16.5px] left-[17.15px] not-italic text-[#64748b] text-[11px] text-center top-[3.25px] whitespace-nowrap">{text}</p>
    </Wrapper>
  );
}

export default function OpenFindingsHistogram() {
  return (
    <div className="relative size-full" data-name="OpenFindingsHistogram">
      <div className="absolute h-[26px] left-0 top-0 w-[371px]" data-name="Container">
        <div className="absolute h-[15px] left-0 top-[5.5px] w-[151.383px]" data-name="Paragraph">
          <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-0 not-italic text-[#64748b] text-[10px] top-[0.5px] tracking-[0.7px] uppercase whitespace-nowrap">Open Findings Over Time</p>
        </div>
        <div className="absolute bg-[rgba(255,255,255,0.04)] content-stretch flex gap-px h-[26px] items-center left-[222px] px-[5px] py-px rounded-[6px] top-0 w-[149px]" data-name="Container">
          <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[6px]" />
          <Wrapper additionalClassNames="bg-[rgba(148,163,184,0.15)] shrink-0 w-[34px]">
            <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[16.5px] left-[17.16px] not-italic text-[#1e293b] text-[11px] text-center top-[3.25px] whitespace-nowrap">3m</p>
          </Wrapper>
          <ButtonText text="6m" />
          <ButtonText text="9m" />
          <Wrapper additionalClassNames="flex-[1_0_0] min-h-px min-w-px">
            <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[16.5px] left-[17.44px] not-italic text-[#64748b] text-[11px] text-center top-[3.25px] whitespace-nowrap">12m</p>
          </Wrapper>
        </div>
      </div>
      <div className="absolute h-[340px] left-0 top-[34px] w-[371px]" data-name="Container">
        <div className="absolute content-stretch flex flex-col h-[340px] items-start left-0 top-0 w-[327px]" data-name="Container">
          <div className="h-[340px] overflow-clip relative shrink-0 w-full" data-name="Icon">
            <div className="absolute inset-[1.18%_2%]" data-name="Vector">
              <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 313.92 332">
                <path d={svgPaths.p13979f00} fill="url(#paint0_linear_8497_25963)" id="Vector" />
                <defs>
                  <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_8497_25963" x1="245.461" x2="0.460923" y1="166.5" y2="166.5">
                    <stop stopColor="#818CF8" stopOpacity="0.32" />
                    <stop offset="1" stopColor="#818CF8" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="absolute inset-[1.18%_2%_1.18%_72.53%]" data-name="Vector">
              <div className="absolute inset-[-0.29%_-1.15%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 85.2049 333.918">
                  <path d={svgPaths.p31c80200} id="Vector" stroke="var(--stroke-0, #818CF8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.91801" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute h-[340px] left-[333px] top-0 w-[38px]" data-name="Container">
          <TextText text="Dec 27" additionalClassNames="left-[8px] top-[335.5px] w-[30px]" />
          <TextText text="Jan 3" additionalClassNames="left-[14.4px] top-[309.34px] w-[24px]" />
          <TextText text="Jan 10" additionalClassNames="left-[10.62px] top-[283.19px] w-[27px]" />
          <TextText text="Jan 17" additionalClassNames="left-[11.2px] top-[257.03px] w-[27px]" />
          <TextText text="Jan 24" additionalClassNames="left-[8.8px] top-[230.88px] w-[29px]" />
          <TextText text="Jan 31" additionalClassNames="left-[10.73px] top-[204.73px] w-[27px]" />
          <TextText text="Feb 7" additionalClassNames="left-[14.66px] top-[178.57px] w-[23px]" />
          <TextText text="Feb 14" additionalClassNames="left-[10.27px] top-[152.42px] w-[28px]" />
          <TextText text="Feb 21" additionalClassNames="left-[10.6px] top-[126.27px] w-[27px]" />
          <TextText text="Feb 28" additionalClassNames="left-[8.7px] top-[100.11px] w-[29px]" />
          <TextText text="Mar 7" additionalClassNames="left-[13.8px] top-[73.96px] w-[24px]" />
          <TextText text="Mar 14" additionalClassNames="left-[9.42px] top-[47.8px] w-[29px]" />
          <TextText text="Mar 21" additionalClassNames="left-[9.74px] top-[21.65px] w-[28px]" />
          <TextText text="Mar 28" additionalClassNames="left-[7.84px] top-[-4.5px] w-[30px]" />
        </div>
      </div>
      <div className="absolute content-stretch flex h-[10px] items-center justify-center left-0 px-[171.5px] top-[377px] w-[371px]" data-name="Container">
        <div className="bg-[rgba(148,163,184,0.18)] h-[3px] rounded-[2px] shrink-0 w-[28px]" data-name="Container" />
      </div>
    </div>
  );
}