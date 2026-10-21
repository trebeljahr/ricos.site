import { BOOLEAN_OPERATIONS } from "src/lib/computer/booleanExplanations";

/** A compact notation reference for the three operators introduced in the chapter. */
export function BooleanOperators() {
  return (
    <div className="not-prose my-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="mb-3 text-left font-medium">Basic Boolean operators</caption>
        <thead>
          <tr className="border-b border-gray-300 dark:border-gray-600">
            <th scope="col" className="px-2 py-3">
              Operator
            </th>
            <th scope="col" className="px-2 py-3">
              Notation
            </th>
            <th scope="col" className="px-2 py-3">
              Meaning
            </th>
          </tr>
        </thead>
        <tbody>
          {(["not", "and", "or"] as const).map((gate) => {
            const definition = BOOLEAN_OPERATIONS[gate];
            return (
              <tr key={gate} className="border-b border-gray-200 dark:border-gray-700">
                <th scope="row" className="px-2 py-3 font-medium">
                  {definition.name}
                </th>
                <td className="whitespace-nowrap px-2 py-3 font-serif text-xl">
                  {definition.notations[0].expression}
                </td>
                <td className="px-2 py-3 leading-relaxed">{definition.rule}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
