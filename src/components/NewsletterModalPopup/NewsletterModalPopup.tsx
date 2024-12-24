import { NewsletterForm } from "@components/NewsletterSignup";
import { useScrollVisibility } from "@components/ShowAfterScrolling";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useCallback, useEffect } from "react";
import { FiChevronsRight, FiX } from "react-icons/fi";
import { useScrollLock } from "src/hooks/useScrollLock";
import useLocalStorageState from "use-local-storage-state";

const NewsletterModalPopup = ({
  howFarDown = 1.5,
}: {
  howFarDown?: number;
}) => {
  const [dismissed, setDismissed] = useLocalStorageState(
    "newsletter-popup-dismissed",
    {
      defaultValue: false,
    }
  );

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
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Payment successful
                </Dialog.Title>

                <button
                  onClick={closeModalForGood}
                  className="fixed top-3 right-3 hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full"
                  aria-label="Close newsletter popup"
                >
                  <FiX className="w-6 h-6" />
                </button>
                <div className="p-5 md:p-0 md:w-8/12 mx-auto my-12">
                  <NewsletterForm
                    heading={<h2 className="mt-0">Not subscribed yet?</h2>}
                    text={
                      <>
                        <p className="mb-4">
                          Join the Live and Learn Newsletter to receive insights
                          straight to your inbox every two weeks on Sunday!
                        </p>
                        <ul className="list-disc mb-4">
                          <li>✨ Inspiring quotes</li>
                          <li>✍️ Exclusive posts on fascinating topics</li>
                          <li>🖇️ Curated links to cutting-edge ideas</li>
                          <li>🌌 Travel stories</li>
                        </ul>
                        <p className="mb-4">No spam. No noise.</p>
                      </>
                    }
                    link={
                      <button
                        onClick={closeModal}
                        className="flex mt-10 justify-center items-center"
                        aria-label="Continue reading"
                      >
                        <span>Continue Reading</span>
                        <FiChevronsRight className="ml-2" />
                      </button>
                    }
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default NewsletterModalPopup;
