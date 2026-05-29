import clsx from "clsx";
type ContainerProps = {
  additionalClassNames?: string;
};

function Container({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerProps>) {
  return (
    <div className={clsx("h-[17.602px] relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[6px] items-start relative size-full">{children}</div>
    </div>
  );
}
type WrapperProps = {
  additionalClassNames?: string;
};

function Wrapper({ children, additionalClassNames = "" }: React.PropsWithChildren<WrapperProps>) {
  return (
    <div className={clsx("h-[17.602px] relative", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">{children}</div>
    </div>
  );
}

function Paragraph({ children }: React.PropsWithChildren<{}>) {
  return (
    <Wrapper additionalClassNames="flex-[1_0_0] min-h-px min-w-px">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[0] left-0 not-italic text-[#1e293b] text-[0px] text-[11px] top-0 whitespace-nowrap">{children}</p>
    </Wrapper>
  );
}
type TextText2Props = {
  text: string;
  additionalClassNames?: string;
};

function TextText2({ text, additionalClassNames = "" }: TextText2Props) {
  return (
    <div className={clsx("absolute h-[17.602px] top-0 w-[3.078px]", additionalClassNames)}>
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.6px] left-0 not-italic text-[#1e293b] text-[11px] top-0 whitespace-nowrap">{text}</p>
    </div>
  );
}
type TextText1Props = {
  text: string;
  additionalClassNames?: string;
};

function TextText1({ text, additionalClassNames = "" }: TextText1Props) {
  return (
    <div className={clsx("absolute bg-[#f1f5f9] content-stretch flex h-[16.5px] items-center px-[6px] py-[2px] rounded-[4px] top-[0.55px]", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[14.4px] not-italic relative shrink-0 text-[#64748b] text-[9px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type TextTextProps = {
  text: string;
};

function TextText({ text }: TextTextProps) {
  return (
    <Wrapper additionalClassNames="shrink-0 w-[6.453px]">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.6px] left-0 not-italic text-[#64748b] text-[14px] top-[0.5px] tracking-[-0.1504px] whitespace-nowrap">{text}</p>
    </Wrapper>
  );
}

export default function FindingDetailView() {
  return (
    <div className="bg-[#f1f5f9] relative rounded-[8px] size-full" data-name="FindingDetailView">
      <div className="absolute border border-[rgba(0,0,0,0.1)] border-solid h-[150.008px] left-0 rounded-[8px] top-0 w-[749.188px]" data-name="Container" />
      <div className="absolute content-stretch flex flex-col gap-[10px] h-[150.008px] items-start left-0 pl-[13px] py-[11px] top-0 w-[749.188px]" data-name="Container">
        <Container additionalClassNames="w-[457.875px]">
          <TextText text="•" />
          <Paragraph>
            <span className="leading-[17.6px]">{`File: `}</span>
            <span className="[text-decoration-skip-ink:none] decoration-solid font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.6px] text-[#1d293d] underline">Medical_Records_Q3.xlsx</span>
            <span className="leading-[17.6px]">{` (5.4 MB) — 847 rows, 9 sensitive data type categories`}</span>
          </Paragraph>
        </Container>
        <Container additionalClassNames="w-[343.953px]">
          <TextText text="•" />
          <Paragraph>
            <span className="leading-[17.6px]">{`Data store: `}</span>
            <span className="[text-decoration-skip-ink:none] decoration-solid font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.6px] text-[#1d293d] underline">HR Confidential</span>
            <span className="leading-[17.6px]">{` (Google Drive acme-hr.google.com)`}</span>
          </Paragraph>
        </Container>
        <Container additionalClassNames="w-[482.609px]">
          <TextText text="•" />
          <Wrapper additionalClassNames="flex-[1_0_0] min-h-px min-w-px">
            <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.6px] left-0 not-italic text-[#1e293b] text-[11px] top-0 whitespace-nowrap">{`Sharing: 'Anyone with the link can view' — link active for 14 days, 23 external views logged`}</p>
          </Wrapper>
        </Container>
        <Container additionalClassNames="w-[395.242px]">
          <TextText text="•" />
          <Paragraph>
            <span className="leading-[17.6px]">{`Link created by: `}</span>
            <span className="[text-decoration-skip-ink:none] decoration-solid font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.6px] text-[#1d293d] underline">Diana Reyes</span>
            <span className="leading-[17.6px]">{` (diana.reyes@company.com) on 2024-11-18`}</span>
          </Paragraph>
        </Container>
        <div className="flex-[1_0_0] min-h-px min-w-px relative w-[545.547px]" data-name="Container">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[6px] items-start relative size-full">
            <TextText text="•" />
            <Wrapper additionalClassNames="flex-[1_0_0] min-h-px min-w-px">
              <div className="absolute h-[17.602px] left-0 top-0 w-[162.828px]" data-name="Text">
                <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.6px] left-0 not-italic text-[#1e293b] text-[11px] top-0 whitespace-nowrap">{`DLP profile matched: PHI, PII — `}</p>
              </div>
              <TextText1 text="Medical Records" additionalClassNames="left-[166.83px] w-[83.391px]" />
              <TextText2 text="," additionalClassNames="left-[254.22px]" />
              <TextText1 text="Social Security Numbers" additionalClassNames="left-[261.3px] w-[117.609px]" />
              <TextText2 text="," additionalClassNames="left-[382.91px]" />
              <TextText1 text="Healthcare IDs" additionalClassNames="left-[389.98px] w-[75.133px]" />
              <TextText2 text="," additionalClassNames="left-[469.12px]" />
              <TextText1 text="Birthdates" additionalClassNames="left-[476.2px] w-[56.898px]" />
            </Wrapper>
          </div>
        </div>
      </div>
    </div>
  );
}