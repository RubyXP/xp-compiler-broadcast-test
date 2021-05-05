import { Command } from 'commander';
import Web3 from 'web3';

const app = new Command();

app
  .option('-b --byte-code <byte_code>', 'contract byte code')
  .option('-n --node <node_uri>', 'eth node uri')
  .option('-k --key <private_key>', 'private key');

app.parse(process.argv);

const abi_raw = '[{"inputs":[],"name":"send","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}]'

const args = app.opts();

const main = async () => {
    const web3 = new Web3(args.node);
    const abi = JSON.parse(abi_raw);
    const byteCode = `0x${args.byteCode}`;
    const account = web3.eth.accounts.privateKeyToAccount(`0x${args.key}`);
    const gas = await web3.eth.getBlock("latest")
    const gasP = await web3.eth.getGasPrice()

    let contract = new web3.eth.Contract(abi);

    async function send(transaction: any, to?: string) {
        const options = {
            from: account.address,
            to  : to,
            data: transaction.encodeABI(),
            gas : gas.gasLimit,
            gasPrice: gasP
        };
        const signedTransaction = await web3.eth.accounts.signTransaction(options, `0x${args.key}`);
        return await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction!);
    }

    const deployed = await send(contract.deploy({data: byteCode}));
    console.log("Deployed contract address:", deployed.contractAddress);

    const tx = await account.signTransaction({
        "from": account.address,
        "nonce": await web3.eth.getTransactionCount(account.address),
        "gasPrice": gasP,
        "gas": web3.utils.toHex(gas.gasLimit),
        "to": deployed.contractAddress,
        "value": web3.utils.toHex(web3.utils.toWei('0.00005', 'ether')),
        "chainId": 3,
    });

    const txid = await web3.eth.sendSignedTransaction(tx.rawTransaction!);
    console.log("sent wei to contract. hash:", txid.transactionHash)
    contract = new web3.eth.Contract(abi, deployed.contractAddress);

    const sendTx = await send(contract.methods.send(), deployed.contractAddress);
    console.log("Executed contract! TxHash:", sendTx.transactionHash)
}

main()