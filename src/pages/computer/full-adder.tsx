import { FullAdder } from "@components/computer/Adders";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function FullAdderPage() {
  return (
    <DeviceDemoPage slug="full-adder" description="A full adder built from gates.">
      <FullAdder />
    </DeviceDemoPage>
  );
}
