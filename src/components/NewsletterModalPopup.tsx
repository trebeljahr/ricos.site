import { useCallback, useEffect } from "react";
import { FiChevronsRight, FiX } from "react-icons/fi";
import Modal from "react-modal";
import useLocalStorageState from "use-local-storage-state";
import { NewsletterForm } from "./NewsletterSignup";
import { useScrollVisibility } from "./ShowAfterScrolling";

Modal.setAppElement("#__next");

export const NewsletterModalPopup = ({
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
  const { visible, setVisible } = useScrollVisibility({
    howFarDown,
  });
  const show = !dismissed && visible;

  useScrollLock(show);

  function closeModalForGood() {
    setVisible(false);
    setDismissed(true);
  }

  function closeModal() {
    setVisible(false);
  }

  return (
    <Modal
      isOpen={show}
      onRequestClose={closeModal}
      contentLabel="Newsletter Popup Form"
      style={{
        overlay: {
          visibility: show ? "visible" : "hidden",
          transition: "visibility 3s linear,opacity 3s linear",
          opacity: show ? 1 : 0,
          zIndex: 300,
        },
        content: {
          visibility: show ? "visible" : "hidden",
          transition: "visibility 3s linear,opacity 3s linear",
          opacity: show ? 1 : 0,
          zIndex: 300,
        },
      }}
      className="prose-sm fixed top-0 left-0 bg-white dark:bg-gray-800 w-screen h-screen overflow-y-scroll"
    >
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
                Join the Live and Learn Newsletter to receive insights straight
                to your inbox every two weeks on Sunday!
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
    </Modal>
  );
};

export default NewsletterModalPopup;

export function useScrollLock(lock: boolean) {
  const lockScroll = useCallback(() => {
    document.body.style.overflow = "hidden";
  }, []);

  const unlockScroll = useCallback(() => {
    document.body.style.overflow = "auto";
  }, []);

  useEffect(() => {
    if (lock) {
      lockScroll();
    } else {
      unlockScroll();
    }

    return () => {
      unlockScroll();
    };
  }, [lock, lockScroll, unlockScroll]);
}
