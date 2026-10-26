import {
  BOOLEAN_NOTATION_CONVENTIONS,
  BOOLEAN_OPERATION_IDS,
  BOOLEAN_OPERATIONS,
} from "src/lib/computer/booleanExplanations";

/** The seven common computer gates, grouped by notation convention. */
export function BooleanOperators() {
  return (
    <div className="not-prose my-6 overflow-x-auto" data-computer-embed="wide">
      <table className="w-full min-w-[620px] border-collapse text-left text-sm">
        <caption className="mb-3 text-left font-medium">Basic Boolean operators</caption>
        <thead>
          <tr className="border-b border-gray-300 dark:border-gray-600">
            <th scope="col" className="px-2 py-3">
              Operator
            </th>
            {BOOLEAN_NOTATION_CONVENTIONS.map(({ id, label }) => (
              <th key={id} scope="col" className="px-2 py-3">
                {label}
              </th>
            ))}
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
                {BOOLEAN_NOTATION_CONVENTIONS.map(({ id }) => (
                  <td key={id} className="px-2 py-3 font-serif text-xl">
                    {definition.notations[id] ? (
                      <div className="flex flex-col gap-1">
                        {definition.notations[id]?.map(({ expression, reading, overline }) => (
                          <span
                            key={expression}
                            className="whitespace-nowrap"
                            role="math"
                            aria-label={reading}
                          >
                            <span className={overline ? "overline" : undefined} aria-hidden="true">
                              {expression}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400" aria-hidden="true">
                        —
                      </span>
                    )}
                  </td>
                ))}
                <td className="min-w-[180px] px-2 py-3 leading-relaxed">{definition.rule}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
