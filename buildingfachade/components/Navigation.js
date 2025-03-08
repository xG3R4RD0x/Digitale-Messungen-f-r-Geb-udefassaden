import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-lg font-bold">
          Building Facade
        </Link>

        <ul className="flex space-x-4">
          <li>
            <Link href="/" className="hover:text-gray-300">
              Home
            </Link>
          </li>
          <li>
            <Link href="/grabcut-demo" className="hover:text-gray-300">
              GrabCut Demo
            </Link>
          </li>
          <li>
            <Link href="/test" className="hover:text-gray-300">
              Test
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
