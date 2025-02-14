import { NewsletterForm } from "@components/NewsletterForm";
import { useScrollVisibility } from "@components/ShowAfterScrolling";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment } from "react";
import { FiX } from "react-icons/fi";
import { useScrollLock } from "src/hooks/useScrollLock";
import useLocalStorageState from "use-local-storage-state";

const NewsletterModalPopup = ({ howFarDown = 50 }: { howFarDown?: number }) => {
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
                  heading={<h2>Not subscribed yet?</h2>}
                  text={
                    <>
                      <p>
                        Join the Live and Learn Newsletter to receive insights
                        straight to your inbox every two weeks!
                      </p>
                      <ul className="list-disc pl-3">
                        <li>✨ Inspiring quotes</li>
                        <li>✍️ Exclusive posts on fascinating topics</li>
                        <li>🖇️ Curated links to cutting-edge ideas</li>
                        <li>🌌 Travel stories</li>
                      </ul>
                      <p>No spam. No noise.</p>
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
