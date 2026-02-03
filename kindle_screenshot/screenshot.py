"""Kindleアプリのスクリーンショットを撮影するメインモジュール"""

import sys
import time
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple
import hashlib
import io

try:
    import pyautogui
    from PIL import Image
    import imagehash
except ImportError as e:
    print(f"必要なライブラリがインストールされていません: {e}")
    print("pip install pyautogui pillow imagehash を実行してください")
    sys.exit(1)


class KindleScreenshot:
    """Kindleアプリのスクリーンショットを撮影するクラス"""

    KINDLE_WINDOW_TITLES = [
        "Kindle",
        "Amazon Kindle",
        "Kindle for PC",
        "Kindle for Mac",
    ]

    def __init__(
        self,
        output_dir: str = "./screenshots",
        delay: float = 0.5,
        prefix: str = "kindle",
    ):
        """
        Args:
            output_dir: スクリーンショットの保存先ディレクトリ
            delay: ページめくり後の待機時間（秒）
            prefix: ファイル名のプレフィックス
        """
        self.output_dir = Path(output_dir)
        self.delay = delay
        self.prefix = prefix
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def find_kindle_window(self) -> Optional[Tuple[int, int, int, int]]:
        """Kindleウィンドウを検索して位置とサイズを返す

        Returns:
            (x, y, width, height) のタプル、見つからない場合はNone
        """
        try:
            import pygetwindow as gw

            for title in self.KINDLE_WINDOW_TITLES:
                windows = gw.getWindowsWithTitle(title)
                if windows:
                    win = windows[0]
                    return (win.left, win.top, win.width, win.height)
            return None
        except ImportError:
            print("pygetwindowがインストールされていません。全画面をキャプチャします。")
            return None
        except Exception as e:
            print(f"ウィンドウ検索中にエラー: {e}")
            return None

    def take_screenshot(
        self,
        region: Optional[Tuple[int, int, int, int]] = None,
        page_number: Optional[int] = None,
    ) -> Path:
        """スクリーンショットを撮影して保存する

        Args:
            region: キャプチャする領域 (x, y, width, height)
            page_number: ページ番号（ファイル名に使用）

        Returns:
            保存したファイルのパス
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if page_number is not None:
            filename = f"{self.prefix}_{page_number:04d}.png"
        else:
            filename = f"{self.prefix}_{timestamp}.png"

        filepath = self.output_dir / filename

        if region:
            screenshot = pyautogui.screenshot(region=region)
        else:
            screenshot = pyautogui.screenshot()

        screenshot.save(filepath)
        print(f"保存: {filepath}")
        return filepath

    def turn_page(self, direction: str = "next") -> None:
        """ページをめくる

        Args:
            direction: "next" で次のページ、"prev" で前のページ
        """
        if direction == "next":
            pyautogui.press("right")
        elif direction == "prev":
            pyautogui.press("left")
        else:
            raise ValueError(f"無効な方向: {direction}")

        time.sleep(self.delay)

    def _get_image_hash(self, image: Image.Image) -> str:
        """画像のハッシュ値を計算する（類似画像検出用）

        Args:
            image: PIL Image オブジェクト

        Returns:
            画像のperceptual hash文字列
        """
        return str(imagehash.phash(image))

    def _images_are_similar(
        self,
        img1: Image.Image,
        img2: Image.Image,
        threshold: int = 5
    ) -> bool:
        """2つの画像が類似しているかを判定する

        Args:
            img1: 比較する画像1
            img2: 比較する画像2
            threshold: ハッシュ差分の閾値（小さいほど厳密）

        Returns:
            類似している場合True
        """
        hash1 = imagehash.phash(img1)
        hash2 = imagehash.phash(img2)
        return hash1 - hash2 < threshold

    def capture_entire_book(
        self,
        region: Optional[Tuple[int, int, int, int]] = None,
        max_pages: int = 10000,
        similarity_threshold: int = 5,
        consecutive_same_pages: int = 2,
    ) -> list[Path]:
        """本1冊全体を自動でキャプチャする

        最後のページに達すると画面が変わらなくなることを検出して自動停止します。

        Args:
            region: キャプチャする領域
            max_pages: 最大ページ数（安全のため）
            similarity_threshold: 画像類似度の閾値
            consecutive_same_pages: 同じページが連続で検出された回数で停止

        Returns:
            保存したファイルパスのリスト
        """
        saved_files = []
        page_num = 1
        same_page_count = 0
        last_image = None

        print("本1冊全体のキャプチャを開始します...")
        print("Kindleアプリをアクティブにして、最初のページを表示してください。")
        print("5秒後に開始します...")
        print("（Ctrl+Cで中断できます）")
        time.sleep(5)

        try:
            while page_num <= max_pages:
                # スクリーンショットを撮影
                if region:
                    screenshot = pyautogui.screenshot(region=region)
                else:
                    screenshot = pyautogui.screenshot()

                # 前のページと比較
                if last_image is not None:
                    if self._images_are_similar(
                        last_image, screenshot, similarity_threshold
                    ):
                        same_page_count += 1
                        print(f"同じページを検出 ({same_page_count}/{consecutive_same_pages})")

                        if same_page_count >= consecutive_same_pages:
                            print("\n最後のページに到達しました！")
                            break
                    else:
                        same_page_count = 0

                # ファイルを保存
                filename = f"{self.prefix}_{page_num:04d}.png"
                filepath = self.output_dir / filename
                screenshot.save(filepath)
                saved_files.append(filepath)
                print(f"ページ {page_num}: {filepath}")

                last_image = screenshot
                page_num += 1

                # 次のページへ
                self.turn_page("next")

        except KeyboardInterrupt:
            print("\n\nキャプチャを中断しました")

        print(f"\n完了: {len(saved_files)}ページをキャプチャしました")
        print(f"保存先: {self.output_dir}")
        return saved_files

    def capture_multiple_pages(
        self,
        num_pages: int,
        start_page: int = 1,
        region: Optional[Tuple[int, int, int, int]] = None,
    ) -> list[Path]:
        """複数ページを連続でキャプチャする

        Args:
            num_pages: キャプチャするページ数
            start_page: 開始ページ番号
            region: キャプチャする領域

        Returns:
            保存したファイルパスのリスト
        """
        saved_files = []

        print(f"{num_pages}ページのキャプチャを開始します...")
        print("Kindleアプリをアクティブにしてください。3秒後に開始します...")
        time.sleep(3)

        for i in range(num_pages):
            page_num = start_page + i
            print(f"ページ {page_num} をキャプチャ中...")

            filepath = self.take_screenshot(region=region, page_number=page_num)
            saved_files.append(filepath)

            if i < num_pages - 1:
                self.turn_page("next")

        print(f"完了: {len(saved_files)}ページをキャプチャしました")
        return saved_files

    def interactive_capture(self) -> None:
        """対話モードでキャプチャを実行する

        スペースキーでスクリーンショット、矢印キーでページ移動、Escで終了
        """
        print("対話モードを開始します")
        print("操作方法:")
        print("  s: スクリーンショットを撮影")
        print("  n: 次のページ")
        print("  p: 前のページ")
        print("  c: 連続キャプチャ（ページ数を入力）")
        print("  q: 終了")
        print()

        page_counter = 1
        region = self.find_kindle_window()

        if region:
            print(f"Kindleウィンドウを検出: {region}")
        else:
            print("Kindleウィンドウが見つかりません。全画面モードで動作します。")

        while True:
            try:
                cmd = input("コマンド> ").strip().lower()

                if cmd == "s":
                    self.take_screenshot(region=region, page_number=page_counter)
                    page_counter += 1
                elif cmd == "n":
                    self.turn_page("next")
                    print("次のページに移動しました")
                elif cmd == "p":
                    self.turn_page("prev")
                    print("前のページに移動しました")
                elif cmd == "c":
                    try:
                        num = int(input("キャプチャするページ数> "))
                        self.capture_multiple_pages(
                            num_pages=num,
                            start_page=page_counter,
                            region=region,
                        )
                        page_counter += num
                    except ValueError:
                        print("有効な数字を入力してください")
                elif cmd == "q":
                    print("終了します")
                    break
                else:
                    print("無効なコマンドです")
            except KeyboardInterrupt:
                print("\n終了します")
                break


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(
        description="Kindleアプリのスクリーンショットを撮影するツール"
    )

    parser.add_argument(
        "-o", "--output",
        default="./screenshots",
        help="スクリーンショットの保存先ディレクトリ (デフォルト: ./screenshots)",
    )
    parser.add_argument(
        "-n", "--num-pages",
        type=int,
        help="連続キャプチャするページ数",
    )
    parser.add_argument(
        "-s", "--start-page",
        type=int,
        default=1,
        help="開始ページ番号 (デフォルト: 1)",
    )
    parser.add_argument(
        "-d", "--delay",
        type=float,
        default=0.5,
        help="ページめくり後の待機時間（秒） (デフォルト: 0.5)",
    )
    parser.add_argument(
        "-p", "--prefix",
        default="kindle",
        help="ファイル名のプレフィックス (デフォルト: kindle)",
    )
    parser.add_argument(
        "-i", "--interactive",
        action="store_true",
        help="対話モードで実行",
    )
    parser.add_argument(
        "--single",
        action="store_true",
        help="単一のスクリーンショットを撮影",
    )
    parser.add_argument(
        "--auto",
        action="store_true",
        help="本1冊全体を自動でキャプチャ（最後のページを自動検出）",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=10000,
        help="自動キャプチャ時の最大ページ数 (デフォルト: 10000)",
    )

    args = parser.parse_args()

    kindle = KindleScreenshot(
        output_dir=args.output,
        delay=args.delay,
        prefix=args.prefix,
    )

    if args.interactive:
        kindle.interactive_capture()
    elif args.auto:
        region = kindle.find_kindle_window()
        kindle.capture_entire_book(
            region=region,
            max_pages=args.max_pages,
        )
    elif args.num_pages:
        print("3秒後にキャプチャを開始します。Kindleアプリをアクティブにしてください...")
        time.sleep(3)
        region = kindle.find_kindle_window()
        kindle.capture_multiple_pages(
            num_pages=args.num_pages,
            start_page=args.start_page,
            region=region,
        )
    elif args.single:
        print("3秒後にスクリーンショットを撮影します...")
        time.sleep(3)
        region = kindle.find_kindle_window()
        kindle.take_screenshot(region=region)
    else:
        parser.print_help()
        print("\n例:")
        print("  本1冊全体を自動キャプチャ: python -m kindle_screenshot --auto")
        print("  対話モード: python -m kindle_screenshot -i")
        print("  10ページ連続キャプチャ: python -m kindle_screenshot -n 10")
        print("  単一スクリーンショット: python -m kindle_screenshot --single")


if __name__ == "__main__":
    main()
