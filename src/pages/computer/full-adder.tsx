import { FullAdder } from "@components/computer/Adders";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function FullAdderPage() {
  return (
    <DeviceDemoPage
      slug="full-adder"
      description="Add two bits and a carry in, with the truth table of all eight cases."
    >
      <FullAdder />
    </DeviceDemoPage>
  );
}
