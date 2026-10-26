import { BOOLEAN_OPERATION_IDS, BOOLEAN_OPERATIONS } from "src/lib/computer/booleanExplanations";

/** The seven common computer gates, with their Boolean-algebra spellings. */
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
          {BOOLEAN_OPERATION_IDS.map((gate) => {
            const definition = BOOLEAN_OPERATIONS[gate];
            return (
              <tr key={gate} className="border-b border-gray-200 dark:border-gray-700">
                <th scope="row" className="px-2 py-3 font-medium">
                  {definition.name}
                </th>
                <td className="px-2 py-3 font-serif text-xl">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {definition.notations.map(({ expression, reading }) => (
                      <span
                        key={expression}
                        className="whitespace-nowrap"
                        role="math"
                        aria-label={reading}
                      >
                        {expression}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-3 leading-relaxed">{definition.rule}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
        A and B are inputs. 1 means true; 0 means false. Symbols in the same row mean the same
        operation. Here + means OR, so 1 + 1 = 1.
      </p>
    </div>
  );
}
