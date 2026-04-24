import { FiX } from "@components/Icons";
import { NewsletterForm } from "@components/NewsletterForm";
import { useScrollVisibility } from "@components/ShowAfterScrolling";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { Fragment } from "react";
import { useScrollLock } from "src/hooks/useScrollLock";
import useLocalStorageState from "use-local-storage-state";

const NewsletterModalPopup = ({ howFarDown = 50 }: { howFarDown?: number }) => {
  const [dismissed, setDismissed] = useLocalStorageState("newsletter-popup-dismissed", {
    defaultValue: false,
  });

  function closeModal() {
    setVisible(false);
  }

  function closeModalForGood() {
    setDismissed(true);
    closeModal();
  }

  const { visible, setVisible } = useScrollVisibility({
    howFarDown,
  });

  const show = !dismissed && visible;

  useScrollLock(show);

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModalForGood}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </TransitionChild>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-1 md:p-5 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-5 pt-10 md:p-12 text-left align-middle shadow-xl transition-all">
                <NewsletterForm
                  heading={<h2 className="mt-0">Not subscribed yet?</h2>}
                  text={
                    <>
                      <p className="mb-4">
                        Live and Learn is a digital postcard I send out every couple of weeks — part
                        travel diary, part essay, plus a handful of links to things worth sharing.
                      </p>
                      <ul className="list-disc mb-4 pl-3">
                        <li>🌌 Travel stories from wherever I am</li>
                        <li>✍️ Short essays on things I'm thinking about</li>
                        <li>📸 Photos from the road</li>
                        <li>🖇️ A few hand-picked links</li>
                      </ul>
                      <p className="mb-4">No spam. No noise. Just a postcard.</p>
                    </>
                  }
                  link={<></>}
                />
                <button
                  onClick={closeModalForGood}
                  className="fixed top-3 right-3 hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full"
                  aria-label="Close newsletter popup"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default NewsletterModalPopup;
